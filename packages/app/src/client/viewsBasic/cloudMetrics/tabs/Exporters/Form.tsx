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
import { useForm, Controller, useFormState } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import * as yamlParser from "js-yaml";

import graphqlClient from "state/clients/graphqlClient";
import useHasura from "client/hooks/useHasura";

import { ControlledInput } from "client/viewsBasic/common/formUtils";
import { CondRender } from "client/utils/rendering";
import { subdomainValidator } from "client/utils/regex";

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

type Values = {
  type: "cloudwatch" | "stackdriver" | "blackbox";
  name: string;
  credential: string | null;
  config: string;
};

const Schema = yup.object().shape({
  type: yup.string().required(),
  name: yup
    .string()
    .required()
    .matches(subdomainValidator, "Name can only contain 'a-z' and '-'"),
  credential: yup.string().when("type", {
    is: (name: string) => name !== "blackbox",
    then: yup.string().required()
  }),
  config: yup.string().required()
});

const defaultValues: Values = {
  type: "cloudwatch",
  name: "",
  credential: "",
  config: ""
};

export function ExporterForm(props: { tenantId: string; onCreate: Function }) {
  const { tenantId, onCreate } = props;
  const classes = useStyles();

  const { handleSubmit, reset, control, watch } = useForm({
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: defaultValues,
    resolver: yupResolver(Schema)
  });
  const { isValid } = useFormState({
    control
  });
  const type = watch("type");

  const onSubmit = (data: Values) => {
    const config = JSON.stringify(
      yamlParser.load(data.config, {
        schema: yamlParser.JSON_SCHEMA
      })
    );

    graphqlClient
      .CreateExporters({
        exporters: {
          tenant: tenantId,
          type: data.type,
          name: data.name,
          credential: data.type !== "blackbox" ? data.credential : null,
          config: config
        }
      })
      .then(response => {
        onCreate();
        reset(defaultValues);
      });
  };

  return (
    <form className={classes.grid} onSubmit={handleSubmit(onSubmit)}>
      <div className={classes.label}>
        <FormLabel>Add Exporter</FormLabel>
        <FormLabel>Add Cloud Provider</FormLabel>
      </div>
      <div className={classes.control}>
        <Controller
          render={({ field }) => (
            <Select {...field}>
              <MenuItem value={"cloudwatch"}>CloudWatch</MenuItem>
              <MenuItem value={"stackdriver"}>Stackdriver</MenuItem>
              <MenuItem value={"blackbox"}>Blackbox</MenuItem>
            </Select>
          )}
          control={control}
          name="type"
        />
      </div>
      <CondRender when={type === "cloudwatch"}>
        <CloudWatchForm tenantId={tenantId} control={control} />
      </CondRender>
      <CondRender when={type === "stackdriver"}>
        <StackdriverForm tenantId={tenantId} control={control} />
      </CondRender>
      <CondRender when={type === "blackbox"}>
        <BlackboxForm control={control} />
      </CondRender>

      <div className={classes.control}>
        <input type="submit" disabled={!isValid} />
      </div>
    </form>
  );
}

const CloudWatchForm = (props: { tenantId: string; control: any }) => {
  const { tenantId, control } = props;
  const classes = useStyles();

  const { data: credentials } = useHasura(
    `query credentials($tenant_id: String!, $type: String!) {
       credential(where: { tenant: { _eq: $tenant_id }, type: {_eq: $type} }) {
         name
       }
     }`,
    {
      tenant_id: tenantId,
      type: "aws-key"
    }
  );

  return (
    <React.Fragment>
      <CondRender when={credentials === undefined}>
        <div className={classes.control}>
          <p>Loading credentials...</p>
        </div>
      </CondRender>
      <CondRender
        when={credentials !== undefined && credentials?.credential.length === 0}
      >
        <div className={classes.control}>
          <p>There are no defined credentials for this exporter.</p>
        </div>
      </CondRender>
      <CondRender when={credentials?.credential.length > 0}>
        <div className={classes.label}>
          <FormLabel>CloudWatch</FormLabel>
        </div>
        <div className={classes.control}>
          <Controller
            render={({ field }) => (
              <Select {...field}>
                {map(({ name }) => <MenuItem value={name}>{name}</MenuItem>)(
                  credentials?.credential
                )}
              </Select>
            )}
            control={control}
            name="credential"
          />
        </div>
        <ControlledInput
          name="name"
          label="Name"
          control={control}
          labelClass={classes.label}
          controlClass={classes.control}
        />
        <ControlledInput
          name="config"
          label="CloudWatch Config"
          inputProps={{ multiline: true, rows: 10, fullWidth: true }}
          labelClass={classes.label}
          controlClass={classes.control}
          helperText={
            <p>
              CloudWatch{" "}
              <a
                href="https://github.com/prometheus/cloudwatch_exporter#user-content-configuration"
                target="_blank"
                rel="noreferrer"
              >
                configuration format
              </a>{" "}
              documentation.
            </p>
          }
          control={control}
        />
      </CondRender>
    </React.Fragment>
  );
};

const StackdriverForm = (props: { tenantId: string; control: any }) => {
  const { tenantId, control } = props;
  const classes = useStyles();

  const { data: credentials } = useHasura(
    `query credentials($tenant_id: String!, $type: String!) {
       credential(where: { tenant: { _eq: $tenant_id }, type: {_eq: $type} }) {
         name
       }
     }`,
    {
      tenant_id: tenantId,
      type: "gcp-service-account"
    }
  );

  return (
    <React.Fragment>
      <CondRender when={credentials === undefined}>
        <div className={classes.control}>
          <p>Loading credentials...</p>
        </div>
      </CondRender>
      <CondRender
        when={credentials !== undefined && credentials?.credential.length === 0}
      >
        <div className={classes.control}>
          <p>There are no defined credentials for this exporter.</p>
        </div>
      </CondRender>
      <CondRender when={credentials?.credential.length > 0}>
        <div className={classes.label}>
          <FormLabel>Stackdriver</FormLabel>
        </div>
        <div className={classes.control}>
          <Controller
            render={({ field }) => (
              <Select {...field}>
                {map(({ name }) => <MenuItem value={name}>{name}</MenuItem>)(
                  credentials?.credential
                )}
              </Select>
            )}
            control={control}
            name="credential"
          />
        </div>
        <ControlledInput
          name="name"
          label="Name"
          control={control}
          labelClass={classes.label}
          controlClass={classes.control}
        />
        <ControlledInput
          name="config"
          label="Stackdriver Config"
          inputProps={{ multiline: true, rows: 10, fullWidth: true }}
          labelClass={classes.label}
          controlClass={classes.control}
          helperText={
            <p>
              Stackdriver{" "}
              <a
                href="https://github.com/prometheus-community/stackdriver_exporter#user-content-flags"
                target="_blank"
                rel="noreferrer"
              >
                configuration format
              </a>{" "}
              documentation.
            </p>
          }
          control={control}
        />
      </CondRender>
    </React.Fragment>
  );
};

const BlackboxForm = (props: { control: any }) => {
  const { control } = props;
  const classes = useStyles();

  return (
    <React.Fragment>
      <ControlledInput
        name="name"
        label="Name"
        control={control}
        labelClass={classes.label}
        controlClass={classes.control}
      />
      <ControlledInput
        name="config"
        label="Blackbox Config"
        inputProps={{ multiline: true, rows: 10, fullWidth: true }}
        labelClass={classes.label}
        controlClass={classes.control}
        helperText={
          <p>
            Blackbox{" "}
            <a
              href="https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md"
              target="_blank"
              rel="noreferrer"
            >
              configuration format
            </a>{" "}
            documentation.
          </p>
        }
        control={control}
      />
    </React.Fragment>
  );
};
