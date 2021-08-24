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

import { cockroachMetricsIntegration as integrationDef } from "./index";

import { ControlledInput } from "client/components/Form/ControlledInput";

import { Card, CardContent, CardHeader } from "client/components/Card";
import { Box } from "client/components/Box";
import { Button } from "client/components/Button";
import { FormProps } from "../types";

// Define separate sections depending on deployment mode.
const Schema = yup.object({
  name: yup.string().required(),
  // TODO show a radio for selecting baremetal/k8s modes. for now we just support k8s
  mode: yup.string().required(),
  k8s: yup.object().shape({
    deployNamespace: yup.string().required(),
    targetNamespace: yup.string().required(),
    targetLabelName: yup.string().required(),
    targetLabelValue: yup.string().required()
  }).nullable().optional()
});

type Values = yup.Asserts<typeof Schema>;

const defaultValues: Values = {
  name: "",
  mode: "k8s",
  k8s: {
    deployNamespace: "opstrace",
    targetNamespace: "default",
    targetLabelName: "app",
    targetLabelValue: "cockroachdb"
  }
};

type FormData = {
  mode: string,
  k8s: {
    deployNamespace: string,
    targetNamespace: string,
    targetLabelName: string,
    targetLabelValue: string
  } | null
};

export const CockroachMetricsForm = ({ handleCreate }: FormProps<FormData>) => {
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
      data: {
        mode: data.mode,
        k8s: data.k8s
      }
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
                <ControlledInput
                  name="k8s.deployNamespace"
                  control={control}
                  inputProps={{ fullWidth: true }}
                  label="Deployment Namespace"
                  helperText="Namespace to deploy the metrics agent in your Kubernetes cluster"
                />
              </Box>
              <Box mb={3}>
                <ControlledInput
                  name="k8s.targetNamespace"
                  control={control}
                  inputProps={{ fullWidth: true }}
                  label="CockroachDB Namespace"
                  helperText="Namespace where CockroachDB is running in your Kubernetes cluster"
                />
              </Box>
              <Box mb={3}>
                <ControlledInput
                  name="k8s.targetLabelName"
                  control={control}
                  inputProps={{ fullWidth: true }}
                  label="CockroachDB Label Name"
                  helperText="Name of a Kubernetes label used for selecting pods in your CockroachDB instance"
                />
              </Box>
              <Box mb={3}>
                <ControlledInput
                  name="k8s.targetLabelValue"
                  control={control}
                  inputProps={{ fullWidth: true }}
                  label="CockroachDB Label Value"
                  helperText="Value of the Kubernetes label used for selecting pods in your CockroachDB instance"
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
