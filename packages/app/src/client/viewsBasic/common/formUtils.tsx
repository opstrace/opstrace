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
import { Controller } from "react-hook-form";
import { HelpCircle } from "react-feather";

import {
  FormLabel,
  FormHelperText,
  TextField,
  TextFieldProps
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

import { Typography } from "client/components/Typography";
import { CondRender } from "client/utils/rendering";
import { Box } from "client/components/Box";

type ControlledInputProps = {
  name: `${string}` | `${string}.${string}` | `${string}.${number}`;
  label?: string;
  helperText?: string | React.ReactNode | (() => React.ReactNode);
  inputProps?: TextFieldProps;
  control: any;
  labelClass?: string;
  controlClass?: string;
};

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

export const ControlledInput = ({
  name,
  label,
  inputProps = {},
  helperText,
  control,
  labelClass,
  controlClass
}: ControlledInputProps) => {
  const classes = useStyles();

  return (
    <Controller
      render={({ field }) => (
        <Box>
          <CondRender unless={label === undefined}>
            <div className={labelClass}>
              <FormLabel>
                <Typography variant="h6" color="textSecondary">
                  {label}
                </Typography>
              </FormLabel>
            </div>
          </CondRender>
          <div className={controlClass}>
            <TextField {...field} {...inputProps} variant="outlined" />
            <CondRender
              unless={helperText === undefined}
              render={() => (
                <FormHelperText>
                  <Typography variant="caption" className={classes.helperText}>
                    <HelpCircle
                      width={12}
                      height={12}
                      className={classes.helperIcon}
                    />
                    <span>{helperText}</span>
                  </Typography>
                </FormHelperText>
              )}
            />
          </div>
        </Box>
      )}
      control={control}
      name={name}
    />
  );
};
