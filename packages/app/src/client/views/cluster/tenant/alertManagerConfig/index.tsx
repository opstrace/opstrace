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

import React, { useState } from "react";
import { useDispatch } from "react-redux";

import { FormContext } from "./formContext";
import Form from "./form";

import useAlertManagerConfig from "state/alertManagerConfig/hooks/alertManagerConfig";
import { upsertTenantConfig } from "state/tenantConfig/actions";

import { AlertManagerBasicConfig } from "state/alertManagerConfig/types";
import { Tenant } from "state/tenant/types";

import { setAlertManagerConfig } from "state/alertManagerConfig/actions";

import TemplateYaml from "./templateYaml";

import { Grid } from "@material-ui/core";

export type FormProps = {
  tenant: Tenant;
};

const AlertManagerConfigForm = (props: FormProps) => {
  const acm = useAlertManagerConfig();
  // const [showYaml, setShowYaml] = useState<boolean>(false);
  const [formData, setFormData] = useState<AlertManagerBasicConfig>(acm);
  const dispatch = useDispatch();

  const onSave = (data: AlertManagerBasicConfig) => {
    setFormData(data);
    dispatch(
      upsertTenantConfig({
        tenant_name: props.tenant.name,
        key: "alertManagerBasicConfig",
        data: data
      })
    );
    dispatch(setAlertManagerConfig(data));
  };

  const onChange = (data: AlertManagerBasicConfig) => {
    setFormData(data);
  };

  return (
    <FormContext.Provider
      value={{
        data: formData,
        tenantName: props.tenantName,
        changeEvent: onChange,
        submitEvent: onSave
      }}
    >
      <Form tenantName="tree_tops" />
      <Grid>
        <TemplateYaml data={formData} />
      </Grid>
    </FormContext.Provider>
  );
};

export default AlertManagerConfigForm;
