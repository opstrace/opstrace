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
import { useForm, Controller } from "react-hook-form";

import graphqlClient from "state/clients/graphqlClient";

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

export function CredentialsForm(props: {
  tenantId: string;
  onCreate: Function;
}) {
  const { tenantId, onCreate } = props;
  const { control, watch } = useForm({ defaultValues: { cloudProvider: "" } });
  const cloudProvider = watch("cloudProvider");

  return (
    <Grid
      container
      alignItems="flex-start"
      justify="flex-start"
      direction="column"
    >
      <Grid item>
        <FormControl>
          <FormLabel>Add Cloud Provider</FormLabel>
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
      </Grid>

      <CondRender when={cloudProvider === "aws"}>
        <AwsForm tenantId={tenantId} onCreate={onCreate} />
      </CondRender>
      <CondRender when={cloudProvider === "gcp"}>
        <GcpForm tenantId={tenantId} onCreate={onCreate} />
      </CondRender>
    </Grid>
  );
}

type AwsValues = {
  name: string;
  accessKeyId: string;
  secretAccessKey: string;
};

const awsDefaultValues: AwsValues = {
  name: "",
  accessKeyId: "",
  secretAccessKey: ""
};

function AwsForm(props: { tenantId: string; onCreate: Function }) {
  const { tenantId, onCreate } = props;
  const classes = useStyles();
  const { handleSubmit, reset, control } = useForm({
    defaultValues: awsDefaultValues
  });
  const onSubmit = (data: AwsValues) => {
    graphqlClient
      .CreateCredentials({
        credentials: {
          tenant: tenantId,
          name: data.name,
          type: "aws-key",
          value: JSON.stringify({
            AWS_ACCESS_KEY_ID: data.accessKeyId,
            AWS_SECRET_ACCESS_KEY: data.secretAccessKey
          })
        }
      })
      .then(response => {
        onCreate();
        reset(awsDefaultValues);
      });
  };

  return (
    <form className={classes.root} onSubmit={handleSubmit(onSubmit)}>
      <ControlledInput name="name" label="Name" control={control} />
      <ControlledInput
        name="accessKeyId"
        label="Access Key ID"
        control={control}
      />
      <ControlledInput
        name="secretAccessKey"
        label="Secret Access Key"
        helperText="Important: this is stored as plain text."
        control={control}
      />

      <Grid
        container
        direction="row"
        justify="space-evenly"
        alignItems="flex-start"
      >
        <Grid item>
          <button type="button" onClick={() => reset(awsDefaultValues)}>
            Reset
          </button>
        </Grid>
        <Grid item>
          <input type="submit" />
        </Grid>
      </Grid>
    </form>
  );
}

type GcpValues = { name: string; accessDoc: string };

const gcpDefaultValues: GcpValues = {
  name: "",
  accessDoc: ""
};

function GcpForm(props: { tenantId: string; onCreate: Function }) {
  const { tenantId, onCreate } = props;
  const classes = useStyles();
  const { handleSubmit, reset, control } = useForm({
    defaultValues: gcpDefaultValues
  });

  const onSubmit = (data: GcpValues) => {
    graphqlClient
      .CreateCredentials({
        credentials: {
          tenant: tenantId,
          name: data.name,
          type: "gcp-service-account",
          value: data.accessDoc
        }
      })
      .then(response => {
        onCreate();
        reset(gcpDefaultValues);
      });
  };

  return (
    <form className={classes.root} onSubmit={handleSubmit(onSubmit)}>
      <ControlledInput name="name" label="Name" control={control} />
      <ControlledInput
        name="accessDoc"
        label="Access Doc"
        inputProps={{ multiline: true, rows: 5 }}
        helperText="Important: this is stored as plain text."
        control={control}
      />

      <Grid
        container
        direction="row"
        justify="space-evenly"
        alignItems="flex-start"
      >
        <Grid item>
          <button type="button" onClick={() => reset(gcpDefaultValues)}>
            Reset
          </button>
        </Grid>
        <Grid item>
          <input type="submit" />
        </Grid>
      </Grid>
    </form>
  );
}
