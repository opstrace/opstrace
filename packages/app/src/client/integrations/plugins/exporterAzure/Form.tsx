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

import React from "react";
import { useForm, useFormState } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

import { exporterAzureIntegration as integrationPlugin } from "./index";

import { ControlledInput } from "client/components/Form/ControlledInput";

import { Card, CardContent, CardHeader } from "client/components/Card";
import { Box } from "client/components/Box";
import { Button } from "client/components/Button";
import { Typography } from "client/components/Typography";
import { ExternalLink } from "client/components/Link";

type Values = {
  name: string;
  subscriptionId: string;
  azureTenantId: string;
  clientId: string;
  clientSecret: string;
  config: string;
};

const Schema = yup.object().shape({
  name: yup.string().required(),
  subscriptionId: yup.string().required(),
  azureTenantId: yup.string().required(),
  clientId: yup.string().required(),
  clientSecret: yup.string().required(),
  config: yup.string().required()
});

const defaultValues: Values = {
  name: "",
  subscriptionId: "",
  azureTenantId: "",
  clientId: "",
  clientSecret: "",
  config: ""
};

type Props = {
  handleCreate: Function;
};

export const ExporterAzureForm = ({ handleCreate }: Props) => {
  const { handleSubmit, control } = useForm({
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: defaultValues,
    resolver: yupResolver(Schema)
  });

  const { isValid } = useFormState({
    control
  });

  const onSubmit = (data: Values) => {
    handleCreate(
      {
        name: data.name,
        data: {
          credentials: {
            AZURE_SUBSCRIPTION_ID: data.subscriptionId,
            AZURE_TENANT_ID: data.azureTenantId,
            AZURE_CLIENT_ID: data.clientId,
            AZURE_CLIENT_SECRET: data.clientSecret
          },
          config: data.config
        }
      },
      { createGrafanaFolder: false }
    );
  };

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
      <Box>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader
              titleTypographyProps={{ variant: "h5" }}
              title={`Install ${integrationPlugin.label} Integration`}
            />
            <CardContent>
              <Box mb={3} mt={2}>
                <ControlledInput
                  name="name"
                  control={control}
                  inputProps={{ fullWidth: true, autoFocus: true }}
                  label="Integration Name"
                  helperText="An identifier for this integration"
                />
              </Box>

              <Box mb={3}>
                <Typography variant="subtitle1">Credentials</Typography>
                <Typography
                  variant="subtitle2"
                  color="textSecondary"
                  gutterBottom={true}
                >
                  This is for an <i>Unmanaged Identity</i>, see the{" "}
                  <ExternalLink
                    target="_blank"
                    href="https://github.com/RobustPerception/azure_metrics_exporter#example-azure-metrics-exporter-config"
                  >
                    documentation
                  </ExternalLink>{" "}
                  for further information
                </Typography>
              </Box>

              <Box mb={3}>
                <ControlledInput
                  name="subscriptionId"
                  control={control}
                  inputProps={{ fullWidth: true }}
                  label="Azure Subscription UUID"
                  helperText="The ID of the billing Subscription."
                />
              </Box>
              <Box mb={3}>
                <ControlledInput
                  name="azureTenantId"
                  control={control}
                  inputProps={{ fullWidth: true }}
                  label="Directory (tenant) UUID"
                  helperText="The ID of the Azure AD instance where the Application is located."
                />
              </Box>
              <Box mb={3}>
                <ControlledInput
                  name="clientId"
                  control={control}
                  inputProps={{ fullWidth: true }}
                  label="Application (client) UUID"
                  helperText="The ID of the Application that had been added to Azure AD."
                />
              </Box>
              <Box mb={3}>
                <ControlledInput
                  name="clientSecret"
                  control={control}
                  inputProps={{ fullWidth: true }}
                  label="Client Secret Value"
                  helperText="The Value of the Client Secret that had been added to the Application. Important: this is stored as plain text."
                />
              </Box>

              <Box mb={3}>
                <Typography variant="subtitle1">Configuration</Typography>
                <Typography
                  variant="subtitle2"
                  color="textSecondary"
                  gutterBottom={true}
                >
                  See the{" "}
                  <ExternalLink
                    target="_blank"
                    href="https://github.com/RobustPerception/azure_metrics_exporter#example-azure-metrics-exporter-config"
                  >
                    documentation
                  </ExternalLink>{" "}
                  for further details
                </Typography>
              </Box>

              <Box mb={3}>
                <ControlledInput
                  name="config"
                  control={control}
                  inputProps={{
                    fullWidth: true,
                    multiline: true,
                    rows: 10,
                    rowsMax: 10
                  }}
                  helperText="YAML formatted config file excluding the credentials section."
                />
              </Box>

              <Button
                type="submit"
                variant="contained"
                state="primary"
                size="large"
                disabled={!isValid}
              >
                Install
              </Button>
            </CardContent>
          </Card>
        </form>
      </Box>
    </Box>
  );
};

export default ExporterAzureForm;
