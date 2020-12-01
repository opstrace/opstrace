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
import { Meta } from "@storybook/react";

import ErrorBoundary, { ErrorProps } from "./Boundary";
import ErrorView from "./View";
import { Typography } from "../Typography";

export default {
  title: "Components/ErrorBoundary"
} as Meta;

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
