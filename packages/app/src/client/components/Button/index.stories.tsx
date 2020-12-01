/**
 * Copyright 2020 Opstrace, Inc.
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
import { action } from "@storybook/addon-actions";
import { withKnobs, radios } from "@storybook/addon-knobs";

import Button from "./Button";

export default {
  title: "Components/Button",
  decorators: [withKnobs]
};

export const Default = (): JSX.Element => {
  const variant = radios(
    "variant",
    {
      text: "text",
      outlined: "outlined",
      contained: "contained"
    },
    "contained",
    "VARIANT"
  );

  const state = radios(
    "state",
    {
      success: "success",
      error: "error",
      warning: "warning",
      primary: "primary",
      secondary: "secondary",
      info: "info"
    },
    "primary",
    "STATE"
  );

  return (
    <Button variant={variant} state={state} onClick={action("button clicked")}>
      button
    </Button>
  );
};
