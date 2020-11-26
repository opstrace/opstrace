import * as React from "react";
import { Box } from "../Box";
import ErrorView from "./View";

type State = {
  error?: Error;
  errorInfo?: React.ErrorInfo;
};

export type ErrorProps = {
  error?: Error;
  errorInfo?: React.ErrorInfo;
};

type Props = {
  children: React.ReactNode;
  errorComponent?: React.ElementType<ErrorProps>;
  fullPage?: boolean;
};

class ErrorBoundary extends React.Component<Props, State> {
  state: State = {};

  componentDidCatch = (error: Error, errorInfo: React.ErrorInfo) => {
    this.setState({
      error,
      errorInfo
    });
    // @matapple: send to error reporter
  };

  render() {
    let content = this.props.children;

    if (this.state.errorInfo) {
      if (this.props.errorComponent) {
        content = (
          <this.props.errorComponent
            error={this.state.error}
            errorInfo={this.state.errorInfo}
          />
        );
      } else {
        content = (
          <ErrorView
            maxWidth={400}
            error={this.state.error}
            errorInfo={this.state.errorInfo}
          />
        );
      }
    }

    if (this.props.fullPage) {
      return (
        <Box
          width="100vw"
          height="100vh"
          display="flex"
          justifyContent="center"
          alignItems="center"
          flexWrap="wrap"
          p={0}
        >
          {content}
        </Box>
      );
    }

    return content;
  }
}

export default ErrorBoundary;
