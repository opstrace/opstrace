/**
 * Copyright 2021 Opstrace, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useRef, useCallback, useState, useEffect } from "react";

import { useDispatch } from "react-redux";
import { makeStyles } from "@material-ui/core/styles";
import { editor } from "monaco-editor/esm/vs/editor/editor.api";
import * as yamlParser from "js-yaml";

import { EditorSkeleton, YamlEditor } from "client/components/Editor";
import { Box } from "client/components/Box";

import {
  alertmanagerConfigSchema,
  jsonSchema
} from "client/validation/alertmanager/config";

import { useForm, useFormState } from "state/form/hooks";
import { useAlertmanager } from "state/tenant/hooks";
import { updateAlertmanager } from "state/tenant/actions";

import { Tenant, Alertmanager } from "state/tenant/types";
import { StatusResponse } from "state/graphql-api-types";

import { CardContent, CardHeader } from "client/components/Card";
import { Button } from "client/components/Button";
import { useSelectedTenant } from "state/tenant/hooks/useTenant";
import { debounce } from "lodash";

type FormData = {
  remoteValidation: StatusResponse;
};

const defaultData: FormData = {
  remoteValidation: {
    success: true
  }
};

const useStyles = makeStyles(theme => ({
  editorContainer: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    overflow: "hidden"
  },
  errorContainer: {
    borderLeft: `4px solid ${theme.palette.error.main}`,
    paddingLeft: theme.spacing(2)
  }
}));

const AlertmanagerConfigEditorLoader = () => {
  const tenant = useSelectedTenant();
  const tenantName = tenant ? tenant.name : "system";
  const alertmanager = useAlertmanager(tenantName);

  if (!tenant || !alertmanager)
    return (
      <Box mt={3} position="relative" width="100%" height={500}>
        <EditorSkeleton />
      </Box>
    );
  else
    return (
      <AlertmanagerConfigEditor tenant={tenant} alertmanager={alertmanager} />
    );
};

type AlertmanagerConfigEditorProps = {
  tenant: Tenant;
  alertmanager: Alertmanager;
};

const AlertmanagerConfigEditor = (props: AlertmanagerConfigEditorProps) => {
  const { tenant, alertmanager } = props;

  const formId = useForm({
    type: "alertmanagerConfig",
    code: tenant.name,
    data: defaultData
  });
  const formState = useFormState<FormData>(formId, defaultData);
  const dataRef = useRef(alertmanager?.config || "");
  const classes = useStyles();

  useEffect(() => {
    dataRef.current = alertmanager?.config;
  }, [alertmanager?.config]);

  const [validationError, setValidationError] = useState<{
    hasError: boolean;
    errors?: string[];
  }>({ hasError: false });
  const dispatch = useDispatch();

  const handleSave = useCallback(() => {
    if (tenant?.name && validationError) {
      dispatch(
        updateAlertmanager({
          tenantName: tenant.name,
          config: dataRef.current,
          formId: formId
        })
      );
    }
  }, [tenant?.name, formId, validationError, dispatch]);

  const handleChange = useCallback((newConfig, filename) => {
    const validationCheck: (
      _filename: string,
      _options?: {
        useModelMarkers: boolean;
      }
    ) => void = (filename, options) => {
      const markers = options?.useModelMarkers
        ? editor.getModelMarkers({
            resource: monaco.Uri.parse(filename)
          })
        : [];

      if (markers.length !== 0) {
        setValidationError({ hasError: true });
      }

      try {
        const parsedData = yamlParser.load(newConfig, {
          schema: yamlParser.JSON_SCHEMA
        });

        alertmanagerConfigSchema
          .validate(parsedData, { strict: true })
          .then((_value: object) => {
            setValidationError({ hasError: false });
          })
          .catch((_err: { name: string; errors: string[] }) => {
            setValidationError({ hasError: true, errors: _err.errors });
          });
      } catch (e) {
        setValidationError({ hasError: true });
      }
    };
    const validationCheckOnChangeStart = debounce(validationCheck, 300, {
      leading: true,
      trailing: false
    });
    const checkValidationOnChangePause = debounce(validationCheck, 500, {
      maxWait: 5000
    });

    validationCheckOnChangeStart(filename);
    checkValidationOnChangePause(filename);
  }, []);

  const validationResponse = formState?.data.remoteValidation;

  return (
    <Box width="100%" minHeight={800} mt={3}>
      <Box display="flex" justifyContent="flex-end">
        <Button
          variant="contained"
          state="primary"
          size="medium"
          disabled={validationError.hasError || formState?.status !== "active"}
          onClick={handleSave}
        >
          Save
        </Button>
      </Box>
      {validationResponse &&
        !validationResponse.success &&
        validationResponse.error_raw_response && (
          <ErrorPanel message={validationResponse.error_raw_response} />
        )}

      <Box
        width="100%"
        minHeight={800}
        mt={3}
        className={classes.editorContainer}
      >
        <YamlEditor
          filename={`${tenant.name}-alertmanager-config.yaml`}
          jsonSchema={jsonSchema}
          data={dataRef.current}
          onChange={handleChange}
        />
      </Box>
    </Box>
  );
};

const ErrorPanel = ({ message }: { message: string }) => {
  const classes = useStyles();

  return (
    <Box className={classes.errorContainer}>
      <CardHeader
        titleTypographyProps={{ variant: "h6" }}
        title="Validation Error:"
      />
      <CardContent>
        {message.split("\n").map(message => (
          <div key={message}>
            {message}
            <br />
          </div>
        ))}
      </CardContent>
    </Box>
  );
};

export default AlertmanagerConfigEditorLoader;
