import React from "react";

import ErrorBoundary, { ErrorProps } from "./Boundary";
import ErrorView from "./View";
import { Typography } from "../Typography";

export default {
  title: "Components/ErrorBoundary"
};

const ThrowRenderErrorComponent = () => {
  throw new Error("I am an error message");
};

const ErrorComponent = (props: ErrorProps) => (
  <ErrorView
    {...props}
    title="Permission Denied"
    subheader=""
    actions={null}
    emoji="💩"
    maxWidth={400}
  >
    <Typography>Contact your adminstrator to update permissions.</Typography>
  </ErrorView>
);

export const Default = (): JSX.Element => (
  <ErrorBoundary>
    <Typography>some text that should render</Typography>
  </ErrorBoundary>
);

export const WithError = (): JSX.Element => (
  <ErrorBoundary>
    <ThrowRenderErrorComponent />
  </ErrorBoundary>
);

export const WithCustomErrorComponentOnError = (): JSX.Element => (
  <ErrorBoundary errorComponent={ErrorComponent}>
    <ThrowRenderErrorComponent />
  </ErrorBoundary>
);
