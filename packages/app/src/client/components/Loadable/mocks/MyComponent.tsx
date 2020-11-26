import React from "react";

export type MyComponentProps = {
  someProp: string;
};

export default class MyComponent extends React.Component<MyComponentProps> {
  render() {
    return <div>This is an async loaded component</div>;
  }
}
