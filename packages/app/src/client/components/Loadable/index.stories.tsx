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
import AsyncComponent from "./AsyncComponent";

// import just the prop types - this won't include the actual components in this bundle
import { MyComponentProps } from "./mocks/MyComponent";
import { MyComponentWithErrorProps } from "./mocks/MyComponentWithError";

export default {
  title: "Components/AsyncComponent"
} as Meta;

export const Default = (): JSX.Element => {
  const Component = AsyncComponent<MyComponentProps>(() =>
    import("./mocks/MyComponent")
  );
  return (
    <div>
      <Component someProp="anything" />
    </div>
  );
};

export const Loading = (): JSX.Element => {
  const Component = AsyncComponent<Record<string, unknown>>(
    () =>
      new Promise(() => {
        console.log("I shall not return. I bit you farewell.");
      })
  );
  return (
    <div>
      <Component someProp="anything" />
    </div>
  );
};

export const LoadingWithError = (): JSX.Element => {
  const Component = AsyncComponent<MyComponentWithErrorProps>(() =>
    import("./mocks/MyComponentWithError")
  );
  return (
    <div>
      <Component someProp="anything" />
    </div>
  );
};
