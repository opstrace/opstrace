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

import { ControlledInput } from "client/viewsBasic/common/formUtils";

import { makeStyles } from "@material-ui/core/styles";
import { FormLabel } from "@material-ui/core";

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
  name: string;
  deployNamespace: string;
};

const Schema = yup.object().shape({
  name: yup.string().required(),
  deployNamespace: yup.string().required()
});

const defaultValues: Values = {
  name: "My Dev Cluster",
  deployNamespace: "opstrace-k8s-monitoring"
};

type Props = {
  handleCreate: Function;
};

export const K8sMetricsForm = ({ handleCreate }: Props) => {
  const classes = useStyles();

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
      data: { deployNamespace: data.deployNamespace }
    });
  };

  return (
    <>
      <div className={classes.grid}>
        <div className={classes.label}>
          <FormLabel>Add Kubernetes Metrics Integration</FormLabel>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className={classes.grid}>
        <ControlledInput
          name="name"
          label="Name"
          control={control}
          labelClass={classes.label}
          controlClass={classes.control}
        />
        <ControlledInput
          name="deployNamespace"
          label="Kubernetes namespace to install in"
          control={control}
          labelClass={classes.label}
          controlClass={classes.control}
        />

        <div className={classes.control}>
          <input type="submit" disabled={!isValid} />
        </div>
      </form>
    </>
  );
};
