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

import { CondRender } from "client/utils/rendering";

import { Input, FormLabel, FormHelperText } from "@material-ui/core";

type ControlledInputProps = {
  name: `${string}` | `${string}.${string}` | `${string}.${number}`;
  label: string;
  helperText?: string | React.ReactNode | (() => React.ReactNode);
  inputProps?: {};
  control: any;
  labelClass?: string;
  controlClass?: string;
};

export const ControlledInput = ({
  name,
  label,
  inputProps = {},
  helperText,
  control,
  labelClass,
  controlClass
}: ControlledInputProps) => {
  console.log(name, helperText);
  return (
    <Controller
      render={({ field }) => (
        <>
          <div className={labelClass}>
            <FormLabel>{label}</FormLabel>
          </div>
          <div className={controlClass}>
            <Input {...field} {...inputProps} />
            <CondRender
              unless={helperText === undefined}
              render={() => <FormHelperText>{helperText}</FormHelperText>}
            />
          </div>
        </>
      )}
      control={control}
      name={name}
    />
  );
};
