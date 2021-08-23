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
import { SelectInput } from "client/components/Form/SelectInput";

import { Card, CardContent, CardHeader } from "client/components/Card";
import { Box } from "client/components/Box";
import { Button } from "client/components/Button";
import { FormProps } from "../types";

const Schema = yup.object({
  name: yup.string().required(),
  k8s: yup.object().shape({
    deployNamespace: yup.string().required(),
    targetNamespace: yup.string().required(),
    targetLabelName: yup.string().required(),
    targetLabelValue: yup.string().required()
  }).nullable().optional(),
  baremetal: yup.object().shape({
    nodeEndpoints: yup.array().of(yup.string()).required()
  }).nullable().optional()
});

type Values = yup.Asserts<typeof Schema>;

const defaultValues: Values = {
  name: "",
  k8s: null,
  baremetal: null
};

type FormData = {
  k8s: {
    deployNamespace: string,
    targetNamespace: string,
    targetLabelName: string,
    targetLabelValue: string
  } | null,
  baremetal: {
    nodeEndpoints: string[]
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
        k8s: data.k8s,
        baremetal: data.baremetal
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
      // TODO onChange: display k8s or baremetal options
                <SelectInput
                  name="deployType"
                  control={control}
                  optionsProps={[
                    { label: "Kubernetes", value: "k8s" },
                    { label: "Bare Metal", value: "baremetal" }
                  ]}
                  label="Deployment type"
                  helperText="Whether CockroachDB is running on Kubernetes or on bare metal."
                />
              </Box>
              <Box mb={3}>
      // TODO onChange: only display when k8s is selected above
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
