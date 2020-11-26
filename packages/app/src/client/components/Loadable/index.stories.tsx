import React from "react";
import AsyncComponent from "./AsyncComponent";

// import just the prop types - this won't include the actual components in this bundle
import { MyComponentProps } from "./mocks/MyComponent";
import { MyComponentWithErrorProps } from "./mocks/MyComponentWithError";

export default {
  title: "Components/AsyncComponent"
};

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
