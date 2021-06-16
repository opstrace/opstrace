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

import { exporterCloudWatchIntegration as integrationDef } from "./index";

import { ControlledInput } from "client/components/Form/ControlledInput";

import { Card, CardContent, CardHeader } from "client/components/Card";
import { Box } from "client/components/Box";
import { Button } from "client/components/Button";
import { ExternalLink } from "client/components/Link";

type Values = {
  name: string;
  accessKeyId: string;
  secretAccessKey: string;
  // raw yaml file content passthrough
  // see examples: https://github.com/prometheus/cloudwatch_exporter#configuration
  config: string;
};

const Schema = yup.object().shape({
  name: yup.string().required(),
  accessKeyId: yup.string().required(),
  secretAccessKey: yup.string().required(),
  config: yup.string().required()
});

const defaultValues: Values = {
  name: "",
  accessKeyId: "",
  secretAccessKey: "",
  config: ""
};

type Props = {
  handleCreate: Function;
};

export const ExporterCloudWatchForm = ({ handleCreate }: Props) => {
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
            AWS_ACCESS_KEY_ID: data.accessKeyId,
            AWS_SECRET_ACCESS_KEY: data.secretAccessKey
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
        <Card>
          <CardHeader
            titleTypographyProps={{ variant: "h5" }}
            title={`Install ${integrationDef.label} Integration`}
          />
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)}>
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
                <ControlledInput
                  name="accessKeyId"
                  control={control}
                  inputProps={{ fullWidth: true }}
                  label="Access Key ID"
                  helperText={
                    <span>
                      AWS access key with{" "}
                      <ExternalLink
                        target="_blank"
                        href="https://github.com/prometheus/cloudwatch_exporter#user-content-credentials-and-permissions"
                      >
                        sufficient permissions
                      </ExternalLink>{" "}
                      for accessing CloudWatch
                    </span>
                  }
                />
              </Box>
              <Box mb={3}>
                <ControlledInput
                  name="secretAccessKey"
                  control={control}
                  inputProps={{ fullWidth: true }}
                  label="Secret Access Key"
                  helperText="Important: the AWS credentials are stored as plain text."
                />
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
                  label="Config"
                  helperText={
                    <span>
                      Amazon CloudWatch exporter{" "}
                      <ExternalLink
                        target="_blank"
                        href="https://github.com/prometheus/cloudwatch_exporter#user-content-configuration"
                      >
                        YAML formatted configuration
                      </ExternalLink>
                    </span>
                  }
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
            </form>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default ExporterCloudWatchForm;
