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
import { Controller, Control, FieldPath } from "react-hook-form";
import { HelpCircle } from "react-feather";

import {
  FormControlLabel,
  FormLabel,
  FormHelperText,
  Radio,
  RadioGroup
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

import { Typography } from "client/components/Typography";
import { Box } from "client/components/Box";

type SelectInputOptionProps = {
  label: React.ReactNode;
  value: string;
};

type SelectInputProps<TFieldValues> = {
  name: FieldPath<TFieldValues>;
  label?: React.ReactNode;
  helperText?: string | React.ReactNode | (() => React.ReactNode);
  optionsProps?: SelectInputOptionProps[];
  control: Control<TFieldValues>;
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

export const SelectInput = <TFieldValues,>({
  name,
  label,
  optionsProps = [],
  helperText,
  control,
  labelClass,
  controlClass
}: SelectInputProps<TFieldValues>) => {
  const classes = useStyles();

  return (
    <Controller
      render={({ field }) => (
        <Box>
          {label && (
            <div className={labelClass}>
              <FormLabel>
                <Typography variant="h6" color="textSecondary">
                  {label}
                </Typography>
              </FormLabel>
            </div>
          )}
          <div className={controlClass}>
            <RadioGroup {...field}>
              {optionsProps.map(optionProps => (
                <FormControlLabel control={<Radio />} {...optionProps} />
              ))}
            </RadioGroup>
            {helperText && (
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
          </div>
        </Box>
      )}
      control={control}
      name={name}
    />
  );
};
