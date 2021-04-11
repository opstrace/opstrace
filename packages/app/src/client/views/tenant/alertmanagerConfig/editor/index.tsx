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

import React, { useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { values, none } from "ramda";
import { isFalse } from "ramda-adjunct";

import { useForm, useFormState } from "state/form/hooks";
import { useTenant, useAlertmanager } from "state/tenant/hooks";
import { updateAlertmanager } from "state/tenant/actions";

import { Tenant, Alertmanager } from "state/tenant/types";
import { StatusResponse } from "state/graphql-api-types";

import { State } from "./types";

import Skeleton from "@material-ui/lab/Skeleton";
import { Box } from "client/components/Box";
import { Card, CardContent, CardHeader } from "client/components/Card";
import { Button } from "client/components/Button";

import tabs from "./tabs";
import { TabbedDetail } from "client/components/TabbedDetail";
import { CondRender } from "client/utils/rendering";

type FormData = {
  remoteValidation: StatusResponse;
};

const defaultData: FormData = {
  remoteValidation: {
    success: true
  }
};

const AlertmanagerConfigEditorLoader = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const tenant = useTenant(tenantId);
  const alertmanager = useAlertmanager(tenantId);

  if (!tenant || !alertmanager)
    return (
      <Skeleton variant="rect" width="100%" height="100%" animation="wave" />
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

  const initialDataRef = useRef({
    config: alertmanager?.config || "",
    templates: alertmanager?.templates || ""
  });

  const dataRef = useRef(initialDataRef.current);

  const [validation, setValidation] = useState<Record<string, boolean>>({});
  const dispatch = useDispatch();

  const validationChanged = useCallback(
    (tabKey: string, valid: boolean) => {
      setValidation({ ...validation, [tabKey]: valid });
    },
    [validation, setValidation]
  );

  const dataUpdated = useCallback((newData: {}) => {
    dataRef.current = { ...dataRef.current, ...newData };
  }, []);

  const isValid = useCallback(() => none(isFalse)(values(validation)), [
    validation
  ]);

  const handleSave = useCallback(() => {
    if (tenant?.name && isValid()) {
      dispatch(
        updateAlertmanager({
          tenantId: tenant.name,
          templates: dataRef.current.templates,
          config: dataRef.current.config,
          formId: formId
        })
      );
    }
  }, [tenant?.name, formId, isValid, dispatch]);

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
            title="Alertmanager"
          />
          <CardContent>
            <TabbedDetail<State>
              tabs={tabs}
              onTabChange={() => (initialDataRef.current = dataRef.current)}
              opts={{
                data: initialDataRef.current,
                setData: dataUpdated,
                setValidation: validationChanged
              }}
            />
          </CardContent>

          <Button
            variant="contained"
            state="primary"
            disabled={!isValid() || formState?.status !== "active"}
            onClick={handleSave}
          >
            publish
          </Button>
          <ErrorPanel response={formState?.data.remoteValidation} />
        </Card>
      </Box>
    </Box>
  );
};

type ErrorPanelProps = {
  response?: StatusResponse;
};

const ErrorPanel = ({ response }: ErrorPanelProps) => (
  <CondRender when={response && !response.success}>
    <CardHeader
      titleTypographyProps={{ variant: "h6" }}
      title="Error: Service side validation failed"
    />

    <CardContent>{response?.error_raw_response}</CardContent>
  </CondRender>
);

export default AlertmanagerConfigEditorLoader;
