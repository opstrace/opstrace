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

import { CondRender } from "client/utils/rendering";

import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import {
  Input,
  Select,
  MenuItem,
  FormControl,
  FormLabel,
  FormHelperText
} from "@material-ui/core";

const useStyles = makeStyles(theme => ({
  root: {
    "& > *": {
      margin: theme.spacing(1),
      width: "25ch"
    }
  }
}));

export function CredentialsForm(props: { tenantId: string }) {
  const { tenantId } = props;
  const { control, watch } = useForm({ defaultValues: { cloudProvider: "" } });
  const cloudProvider = watch("cloudProvider");

  console.log(tenantId);

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
            defaultValue={10}
          />
        </FormControl>
      </Grid>

      <CondRender when={cloudProvider === "aws"}>
        <AwsForm />
      </CondRender>
      <CondRender when={cloudProvider === "gcp"}>
        <GcpForm />
      </CondRender>
    </Grid>
  );
}

type ControlledInputProps = {
  name: `${string}` | `${string}.${string}` | `${string}.${number}`;
  label: string;
  helperText?: string;
  inputProps?: {};
  control: any;
};

const ControlledInput = ({
  name,
  label,
  inputProps = {},
  helperText,
  control
}: ControlledInputProps) => (
  <Grid item>
    <Controller
      render={({ field }) => (
        <FormControl>
          <FormLabel>{label}</FormLabel>
          <Input {...field} {...inputProps} />
          <CondRender when={helperText !== undefined}>
            <FormHelperText>{helperText}</FormHelperText>
          </CondRender>
        </FormControl>
      )}
      control={control}
      name={name}
    />
  </Grid>
);

const awsDefaultValues = {
  name: "",
  accessKeyId: "",
  secretAccessKey: ""
};

function AwsForm() {
  const classes = useStyles();
  const { handleSubmit, reset, control } = useForm({
    defaultValues: awsDefaultValues
  });
  const onSubmit = (data: {}) => console.log(data);

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

const gcpDefaultValues = {
  name: "",
  accessYaml: ""
};

function GcpForm() {
  const classes = useStyles();
  const { handleSubmit, reset, control } = useForm({
    defaultValues: gcpDefaultValues
  });
  const onSubmit = (data: {}) => console.log(data);

  return (
    <form className={classes.root} onSubmit={handleSubmit(onSubmit)}>
      <ControlledInput name="name" label="Name" control={control} />
      <ControlledInput
        name="accessYaml"
        label="Access YAML"
        inputProps={{ multiline: true }}
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
