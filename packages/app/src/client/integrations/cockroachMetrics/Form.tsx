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
import { HelpCircle } from "react-feather";
import * as yup from "yup";

import { cockroachMetricsIntegration as integrationDef } from "./index";

import {
  Checkbox,
  FormControlLabel,
  FormLabel,
  FormHelperText,
  Radio,
  RadioGroup,
  TextField
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

import { Box } from "client/components/Box";
import { Button } from "client/components/Button";
import { Card, CardContent, CardHeader } from "client/components/Card";
import { Typography } from "client/components/Typography";
import { FormProps } from "../types";

const useStyles = makeStyles(theme => ({
  helperText: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap"
  },
  helperIcon: {
    marginRight: 5
  }
}));

// Define separate sections depending on deployment mode.
const Schema = yup.object({
  name: yup.string().required(),
  // TODO show a radio for selecting baremetal/k8s modes. for now we just support k8s
  mode: yup.string().required(),
  insecure: yup.bool().required(),
  k8s: yup
    .object()
    .shape({
      deployNamespace: yup.string().required(),
      targetNamespace: yup.string().required(),
      targetLabelName: yup.string().required(),
      targetLabelValue: yup.string().required()
    })
    .nullable()
    .optional()
});

type Values = yup.Asserts<typeof Schema>;

const defaultValues: Values = {
  name: "",
  mode: "k8s",
  insecure: false,
  k8s: {
    deployNamespace: "opstrace",
    targetNamespace: "default",
    targetLabelName: "app",
    targetLabelValue: "cockroachdb"
  }
};

type FormData = {
  mode: string;
  insecure: boolean;
  k8s: {
    deployNamespace: string;
    targetNamespace: string;
    targetLabelName: string;
    targetLabelValue: string;
  } | null;
};

type CockroachHelperTextProps = {
  helperText: string;
};

const CockroachHelperText = ({ helperText }: CockroachHelperTextProps) => {
  const classes = useStyles();
  return (
    <FormHelperText>
      <Typography variant="caption" className={classes.helperText}>
        <HelpCircle width={12} height={12} className={classes.helperIcon} />
        <span>{helperText}</span>
      </Typography>
    </FormHelperText>
  );
};

type CockroachTextBoxProps = {
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  helperText: string;
  disabled?: boolean;
  autoFocus?: boolean;
};

const CockroachTextBox = ({
  label,
  value,
  onChange,
  helperText,
  disabled,
  autoFocus
}: CockroachTextBoxProps) => {
  return (
    <Box>
      <FormLabel>
        <Typography variant="h6" color="textSecondary">
          {label}
        </Typography>
      </FormLabel>
      <TextField
        inputProps={{
          fullwidth: "true",
          autoFocus: autoFocus,
          disabled: disabled
        }}
        value={value}
        onChange={onChange}
        variant="outlined"
      />
      <CockroachHelperText helperText={helperText} />
    </Box>
  );
};

export const CockroachMetricsForm = ({ handleCreate }: FormProps<FormData>) => {
  const [state, setState] = React.useState({
    isValid: false,
    v: defaultValues
  });

  const onChange = (values: Values) => {
    setState({
      isValid: Schema.isValidSync(values),
      v: values
    });
  };

  // TODO submit refreshes the page before it gets to making the graphql call
  const handleSubmit = () => {
    handleCreate({
      name: state.v.name,
      data: {
        mode: state.v.mode,
        insecure: state.v.insecure,
        k8s: state.v.mode === "k8s" ? state.v.k8s : null
      }
    });
  };

  // TODO toggling the radio does enable/disable k8s fields as expected, but their appearance doesn't change
  //      maybe just hide the fields entirely when Bare Metal is selected...
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
            <form onSubmit={handleSubmit}>
              <Box mb={3} mt={2}>
                <CockroachTextBox
                  label={"Integration Name"}
                  helperText={"An identifier for this integration"}
                  value={state.v.name}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    onChange({ ...state.v, name: event.target.value })
                  }
                  autoFocus={true}
                />
              </Box>
              <Box mb={3}>
                <FormLabel>
                  <Typography variant="h6" color="textSecondary">
                    Insecure Nodes
                  </Typography>
                </FormLabel>
                <Checkbox
                  checked={state.v.insecure}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    onChange({ ...state.v, insecure: event.target.checked })
                  }
                />
                <CockroachHelperText
                  helperText={
                    "Whether the Cockroach nodes are running in '--insecure' mode"
                  }
                />
              </Box>
              <Box mb={3}>
                <FormLabel>
                  <Typography variant="h6" color="textSecondary">
                    Run mode
                  </Typography>
                </FormLabel>
                <RadioGroup
                  defaultValue="k8s"
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    onChange({ ...state.v, mode: event.target.value })
                  }
                >
                  <FormControlLabel
                    control={<Radio />}
                    label="Kubernetes"
                    value="k8s"
                  />
                  <FormControlLabel
                    control={<Radio />}
                    label="Bare Metal"
                    value="baremetal"
                  />
                </RadioGroup>
                <CockroachHelperText
                  helperText={"The environment where you are running Cockroach"}
                />
              </Box>
              <Box mb={3}>
                <CockroachTextBox
                  label={"Agent Kubernetes Namespace"}
                  helperText={
                    "Namespace to deploy the metrics agent in your Kubernetes cluster"
                  }
                  value={state.v.k8s.deployNamespace}
                  disabled={state.v.mode !== "k8s"}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    onChange({
                      ...state.v,
                      k8s: {
                        ...state.v.k8s,
                        deployNamespace: event.target.value
                      }
                    })
                  }
                />
              </Box>
              <Box mb={3}>
                <CockroachTextBox
                  label={"Cockroach Kubernetes Namespace"}
                  helperText={
                    "Namespace where Cockroach is running in your Kubernetes cluster"
                  }
                  value={state.v.k8s.targetNamespace}
                  disabled={state.v.mode !== "k8s"}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    onChange({
                      ...state.v,
                      k8s: {
                        ...state.v.k8s,
                        targetNamespace: event.target.value
                      }
                    })
                  }
                />
              </Box>
              <Box mb={3}>
                <CockroachTextBox
                  label={"Kubernetes Label Name"}
                  helperText={
                    "Name of a Kubernetes label for selecting your Cockroach pods"
                  }
                  value={state.v.k8s.targetLabelName}
                  disabled={state.v.mode !== "k8s"}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    onChange({
                      ...state.v,
                      k8s: {
                        ...state.v.k8s,
                        targetLabelName: event.target.value
                      }
                    })
                  }
                />
              </Box>
              <Box mb={3}>
                <CockroachTextBox
                  label={"Kubernetes Label Value"}
                  helperText={
                    "Value of a Kubernetes label for selecting your Cockroach pods"
                  }
                  value={state.v.k8s.targetLabelValue}
                  disabled={state.v.mode !== "k8s"}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    onChange({
                      ...state.v,
                      k8s: {
                        ...state.v.k8s,
                        targetLabelValue: event.target.value
                      }
                    })
                  }
                />
              </Box>
              <Button
                type="submit"
                variant="contained"
                state="primary"
                size="large"
                disabled={!state.isValid}
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
