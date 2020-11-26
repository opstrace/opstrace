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
