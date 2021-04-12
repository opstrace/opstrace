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
import { map } from "ramda";
import { useForm, Controller } from "react-hook-form";

import graphqlClient from "state/clients/graphqlClient";
import useFetcher from "client/hooks/useFetcher";

import { ControlledInput } from "client/viewsBasic/common/formUtils";
import { CondRender } from "client/utils/rendering";

import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import { Select, MenuItem, FormControl, FormLabel } from "@material-ui/core";

const useStyles = makeStyles(theme => ({
  root: {
    "& > *": {
      margin: theme.spacing(1),
      width: "25ch"
    }
  }
}));

type Values = {
  cloudProvider: string;
  name: string;
  credential: string;
  config: string;
};

const defaultValues: Values = {
  cloudProvider: "",
  name: "",
  credential: "",
  config: ""
};

export function ExporterForm(props: { tenantId: string; onCreate: Function }) {
  const { tenantId, onCreate } = props;
  const classes = useStyles();
  const { handleSubmit, reset, control, watch } = useForm({
    defaultValues: defaultValues
  });
  const cloudProvider = watch("cloudProvider");

  const { data: credentials } = useFetcher(
    `query credentials($tenant_id: String!, $type: String!) {
       credential(where: { tenant: { _eq: $tenant_id }, type: {_eq: $type} }) {
         name
       }
     }`,
    { tenant_id: tenantId, type: cloudProvider }
  );

  const onSubmit = (data: Values) => {
    graphqlClient
      .CreateExporters({
        exporters: {
          tenant: tenantId,
          type: data.cloudProvider,
          name: data.name,
          credential: data.credential,
          config: data.config
        }
      })
      .then(response => {
        onCreate();
        reset(defaultValues);
      });
  };

  return (
    <Grid
      container
      alignItems="flex-start"
      justify="flex-start"
      direction="column"
    >
      <form className={classes.root} onSubmit={handleSubmit(onSubmit)}>
        <FormControl>
          <FormLabel>Add Exporter</FormLabel>
          <Controller
            render={({ field }) => (
              <Select {...field}>
                <MenuItem value={"aws"}>Amazon Web Services</MenuItem>
                <MenuItem value={"gcp"}>Google Cloud Platform</MenuItem>
              </Select>
            )}
            control={control}
            name="cloudProvider"
          />
        </FormControl>
        <CondRender when={credentials?.credential.length > 0}>
          <FormControl>
            <FormLabel>{`${
              cloudProvider === "aws" ? "AWS" : "GCP"
            } Credential`}</FormLabel>
            <Controller
              render={({ field }) => (
                <Select {...field}>
                  {map(({ name }) => {
                    return <MenuItem value={name}>{name}</MenuItem>;
                  })(credentials?.credential)}
                </Select>
              )}
              control={control}
              name="credential"
            />
          </FormControl>
          <ControlledInput name="name" label="Name" control={control} />
          <ControlledInput
            name="config"
            label={`${
              cloudProvider === "aws" ? "CloudWatch" : "Stackdriver"
            } Config`}
            inputProps={{ multiline: true }}
            helperText={
              <>
                <CondRender when={cloudProvider === "aws"}>
                  <p>
                    CloudWatch{" "}
                    <a
                      href="https://github.com/prometheus/cloudwatch_exporter#user-content-configuration"
                      target="_blank"
                    >
                      configuration format
                    </a>
                    .
                  </p>
                </CondRender>
                <CondRender when={cloudProvider === "gcp"}>
                  <p>
                    Stackdriver{" "}
                    <a
                      href="https://github.com/prometheus-community/stackdriver_exporter#user-content-flags"
                      target="_blank"
                    >
                      configuration format
                    </a>
                    .
                  </p>
                </CondRender>
              </>
            }
            control={control}
          />

          <Grid
            container
            direction="row"
            justify="space-evenly"
            alignItems="flex-start"
          >
            <Grid item>
              <button type="button" onClick={() => reset(defaultValues)}>
                Reset
              </button>
            </Grid>
            <Grid item>
              <input type="submit" />
            </Grid>
          </Grid>
        </CondRender>
      </form>
    </Grid>
  );
}
