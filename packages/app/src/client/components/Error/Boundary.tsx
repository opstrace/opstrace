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
