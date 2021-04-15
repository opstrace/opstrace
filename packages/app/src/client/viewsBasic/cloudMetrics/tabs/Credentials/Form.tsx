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
import { useForm, Controller, useFormState } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

import graphqlClient from "state/clients/graphqlClient";

import { ControlledInput } from "client/viewsBasic/common/formUtils";
import { CondRender } from "client/utils/rendering";

import { makeStyles } from "@material-ui/core/styles";
import { Select, MenuItem, FormLabel } from "@material-ui/core";

const useStyles = makeStyles(theme => ({
  grid: {
    display: "grid",
    gridTemplateColumns: "[label] 240px [control] 1fr",
    gridAutoFlow: "row",
    gridGap: ".8em",
    padding: "1.2em"
  },
  label: {
    gridColumn: "label",
    gridRow: "auto",
    alignSelf: "center",
    justifySelf: "end"
  },
  control: {
    gridColumn: "control",
    gridRow: "auto",
    border: "none",
    padding: "1em",
    alignSelf: "center"
  }
}));

export function CredentialsForm(props: {
  tenantId: string;
  onCreate: Function;
}) {
  const classes = useStyles();
  const { tenantId, onCreate } = props;
  const { control, watch } = useForm({
    defaultValues: { cloudProvider: "aws-key" }
  });
  const cloudProvider = watch("cloudProvider");

  return (
    <>
      <div className={classes.grid}>
        <div className={classes.label}>
          <FormLabel>Add Cloud Provider</FormLabel>
        </div>
        <div className={classes.control}>
          <Controller
            render={({ field }) => (
              <Select {...field}>
                <MenuItem value="aws-key">Amazon Web Services</MenuItem>
                <MenuItem value="gcp-service-account">
                  Google Cloud Platform
                </MenuItem>
              </Select>
            )}
            control={control}
            name="cloudProvider"
          />
        </div>
      </div>

      <CondRender when={cloudProvider === "aws-key"}>
        <AwsForm tenantId={tenantId} onCreate={onCreate} />
      </CondRender>
      <CondRender when={cloudProvider === "gcp-service-account"}>
        <GcpForm tenantId={tenantId} onCreate={onCreate} />
      </CondRender>
    </>
  );
}

type AwsValues = {
  name: string;
  accessKeyId: string;
  secretAccessKey: string;
};

const AwsSchema = yup.object().shape({
  name: yup.string().required(),
  accessKeyId: yup.string().required(),
  secretAccessKey: yup.string().required()
});

const awsDefaultValues: AwsValues = {
  name: "",
  accessKeyId: "",
  secretAccessKey: ""
};

function AwsForm(props: { tenantId: string; onCreate: Function }) {
  const classes = useStyles();
  const { tenantId, onCreate } = props;
  const { handleSubmit, reset, control } = useForm({
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: awsDefaultValues,
    resolver: yupResolver(AwsSchema)
  });
  const { isValid } = useFormState({
    control
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
    <form onSubmit={handleSubmit(onSubmit)} className={classes.grid}>
      <ControlledInput
        name="name"
        label="Name"
        control={control}
        labelClass={classes.label}
        controlClass={classes.control}
      />
      <ControlledInput
        name="accessKeyId"
        label="Access Key ID"
        control={control}
        labelClass={classes.label}
        controlClass={classes.control}
      />
      <ControlledInput
        name="secretAccessKey"
        label="Secret Access Key"
        helperText="Important: this is stored as plain text."
        control={control}
        labelClass={classes.label}
        controlClass={classes.control}
      />

      <div className={classes.control}>
        <input type="submit" disabled={!isValid} />
      </div>
    </form>
  );
}

type GcpValues = { name: string; accessDoc: string };

const GcpSchema = yup.object().shape({
  name: yup.string().required(),
  accessDoc: yup.string().required()
});

const gcpDefaultValues: GcpValues = {
  name: "",
  accessDoc: ""
};

function GcpForm(props: { tenantId: string; onCreate: Function }) {
  const classes = useStyles();
  const { tenantId, onCreate } = props;
  const { handleSubmit, reset, control } = useForm({
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: gcpDefaultValues,
    resolver: yupResolver(GcpSchema)
  });
  const { isValid } = useFormState({
    control
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
    <form onSubmit={handleSubmit(onSubmit)} className={classes.grid}>
      <ControlledInput
        name="name"
        label="Name"
        control={control}
        labelClass={classes.label}
        controlClass={classes.control}
      />
      <ControlledInput
        name="accessDoc"
        label="Access Doc"
        inputProps={{ multiline: true, rows: 10, fullWidth: true }}
        helperText="Important: this is stored as plain text."
        control={control}
        labelClass={classes.label}
        controlClass={classes.control}
      />

      <div className={classes.control}>
        <input type="submit" disabled={!isValid} />
      </div>
    </form>
  );
}
