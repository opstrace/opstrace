import React from "react";

export type MyComponentWithErrorProps = {
  someProp: string;
};

export default class MyComponentWithError extends React.Component<
  MyComponentWithErrorProps
> {
  render() {
    throw Error("This is a simulated error");
    return null;
  }
}
