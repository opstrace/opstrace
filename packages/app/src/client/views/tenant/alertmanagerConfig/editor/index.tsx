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

import React, { useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { values, any } from "ramda";
import { isTrue } from "ramda-adjunct";

import { useForm, useFormState } from "state/form/hooks";
import { useTenant, useAlertmanager } from "state/tenant/hooks";
import { updateAlertmanager } from "state/tenant/actions";

import { AlertmanagerUpdateResponse } from "state/graphql-api-types";

import { Context, Data } from "./context";

import Skeleton from "@material-ui/lab/Skeleton";
import { Box } from "client/components/Box";
import { Card, CardContent, CardHeader } from "client/components/Card";
import { Button } from "client/components/Button";

import tabs from "./tabs";
import { TabbedDetail } from "client/components/TabbedDetail";
import { CondRender } from "client/utils/rendering";

type FormData = {
  remoteValidation: AlertmanagerUpdateResponse;
};

const defaultData: FormData = {
  remoteValidation: {
    success: true
  }
};

const AlertmanagerConfigEditor = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const tenant = useTenant(tenantId);
  const formId = useForm({
    type: "alertmanagerConfig",
    code: tenantId,
    data: defaultData
  });
  const formState = useFormState<FormData>(formId, defaultData);
  const alertmanager = useAlertmanager(tenantId);
  const [data, setData] = useState({
    config: alertmanager?.config || "",
    templates: alertmanager?.templates || ""
  });

  const [validation, setValidation] = useState<Record<string, boolean>>({
    default: false
  });
  const dispatch = useDispatch();

  const validationChanged = (tabKey: string, valid: boolean) => {
    setValidation({ ...validation, [tabKey]: valid });
  };

  const dataUpdated = (newData: {}) => {
    setData({ ...data, ...newData });
  };

  const isValid = useCallback(() => any(isTrue)(values(validation)), [
    validation
  ]);

  const handleSave = useCallback(() => {
    if (tenant?.name && isValid()) {
      dispatch(
        updateAlertmanager({
          tenantId: tenant.name,
          templates: data.templates,
          config: data.config,
          formId: formId
        })
      );
    }
  }, [tenant?.name, data.templates, data.config, formId, isValid, dispatch]);

  if (!tenant || !formState)
    return (
      <Skeleton variant="rect" width="100%" height="100%" animation="wave" />
    );
  else
    return (
      <Box
        width="100%"
        height="100%"
        display="flex"
        justifyContent="center"
        alignItems="center"
        flexWrap="wrap"
        p={1}
      >
        <Box maxWidth={900}>
          <Card p={3}>
            <CardHeader
              titleTypographyProps={{ variant: "h5" }}
              title="Alertmanager Configuration"
            />
            <CardContent>
              <Context.Provider
                value={[data as Data, dataUpdated, validationChanged]}
              >
                <TabbedDetail tabs={tabs} />
              </Context.Provider>
            </CardContent>

            <Button
              variant="contained"
              state="primary"
              disabled={!isValid() || formState.status !== "active"}
              onClick={handleSave}
            >
              publish
            </Button>
            <ErrorPanel response={formState.data.remoteValidation} />
          </Card>
        </Box>
      </Box>
    );
};

type ErrorPanelProps = {
  response: AlertmanagerUpdateResponse;
};

const ErrorPanel = ({ response }: ErrorPanelProps) => (
  <CondRender unless={response.success}>
    <CardHeader
      titleTypographyProps={{ variant: "h6" }}
      title="Error: Service side validation failed"
    />

    <CardContent>{response.error_raw_response}</CardContent>
  </CondRender>
);

export default AlertmanagerConfigEditor;
