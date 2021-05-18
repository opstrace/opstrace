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

import { ControlledInput } from "client/viewsBasic/common/formUtils";

import { Card, CardContent, CardHeader } from "client/components/Card";
import { Box } from "client/components/Box";
import Attribute from "client/components/Attribute";
import { Button } from "client/components/Button";

import { makeStyles } from "@material-ui/core/styles";

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
  deployNamespace: "opstrace-promtail"
};

type Props = {
  handleCreate: Function;
};

export const K8sLogsForm = ({ handleCreate }: Props) => {
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
    <Box
      width="100%"
      height="100%"
      display="flex"
      justifyContent="center"
      alignItems="center"
      flexWrap="wrap"
      p={1}
    >
      <Card>
        <CardHeader
          titleTypographyProps={{ variant: "h5" }}
          title={`Add ${integrationDef.label} Integration`}
        />
        <CardContent>
          <Box display="flex">
            <form onSubmit={handleSubmit(onSubmit)} className={classes.grid}>
              <Box display="flex" flexDirection="column">
                <Attribute.Key>Name:</Attribute.Key>
                <Attribute.Key>Deployment Namespace:</Attribute.Key>
                <Attribute.Key>{""}</Attribute.Key>
              </Box>
              <Box display="flex" flexDirection="column" flexGrow={1}>
                <Attribute.Value>
                  <ControlledInput name="name" control={control} />
                </Attribute.Value>
                <Attribute.Value>
                  <ControlledInput name="deployNamespace" control={control} />
                </Attribute.Value>
                <Attribute.Value>
                  <Button
                    type="submit"
                    variant="contained"
                    size="medium"
                    disabled={!isValid}
                  >
                    Add
                  </Button>
                </Attribute.Value>
              </Box>
            </form>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
