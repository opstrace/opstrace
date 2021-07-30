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

import { k8sLogsIntegration as integrationDef } from "./index";

import { ControlledInput } from "client/components/Form/ControlledInput";
import { SelectInput } from "client/components/Form/SelectInput";

import { Card, CardContent, CardHeader } from "client/components/Card";
import { Box } from "client/components/Box";
import { Button } from "client/components/Button";
import { Typography } from "client/components/Typography";

type Values = {
  name: string;
  deployNamespace: string;
  format: string;
};

const Schema = yup.object().shape({
  name: yup.string().required(),
  deployNamespace: yup.string().required(),
  format: yup.string().required()
});

const defaultValues: Values = {
  name: "",
  deployNamespace: "opstrace",
  format: "cri"
};

type Props = {
  handleCreate: Function;
};

export const K8sLogsForm = ({ handleCreate }: Props) => {
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
    handleCreate({
      name: data.name,
      data: { deployNamespace: data.deployNamespace, format: data.format }
    });
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
                <SelectInput
                  name="format"
                  control={control}
                  optionsProps={[
                    {label:"CRI/containerd", value:"cri"},
                    {label:"dockerd", value:"docker"}
                  ]}
                  label="Container Runtime"
                  helperText="The cluster container runtime affects the log format."
                />
                <Typography color="textSecondary" variant="caption">
                  To find this, check for either <code>containerd://</code> or <code>docker://</code> from this command:<br />
                  &nbsp; &nbsp;<code>$ kubectl get nodes \<br />
                  &nbsp; &nbsp; -o jsonpath={"'{.items[].status.nodeInfo.containerRuntimeVersion}'"}</code>
                </Typography>
              </Box>
              <Box mb={3}>
                <ControlledInput
                  name="deployNamespace"
                  control={control}
                  inputProps={{ fullWidth: true }}
                  label="Deployment Namespace"
                  helperText="Namespace to deploy to in your Kubernetes cluster"
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
