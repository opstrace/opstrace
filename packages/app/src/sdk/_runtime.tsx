/**
 * Copyright 2021 Opstrace, Inc.
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

/**
 * This module will not be available to users of the SDK.
 */

import React, { useEffect, useState, useMemo } from "react";
import ReactDOM from "react-dom";
import { BrowserRouter } from "react-router-dom";
import { Route, Switch } from "react-router";
import Skeleton from "@material-ui/lab/Skeleton";
import { Box } from "client/components/Box";
import Layout from "client/components/Layout/Layout";
import Row from "client/components/Layout/Row";
import Column from "client/components/Layout/Column";
import { ErrorView } from "client/components/Error";
import ErrorBoundary, { ErrorProps } from "client/components/Error/Boundary";
import Theme from "client/themes";
import Services from "client/services";
import { StoreProvider } from "state/provider";
import useSandboxState from "state/sandbox/hooks/useSandboxState";
import { Typography } from "client/components/Typography";

window.React = React;

let intervalTimers: number[] = [];
let timeoutTimers: number[] = [];
const _originalSetInterval = window.setInterval;
const _originalSetTimeout = window.setTimeout;
// Monkeypatch timers so we can dispose intervalTimers during hot reloading of an updated module
//@ts-ignore
window.setInterval = (handler: TimerHandler, timeout?: number | undefined) => {
  const timer = _originalSetInterval(handler, timeout);
  intervalTimers.push(timer);
  return timer;
};
//@ts-ignore
window.setTimeout = (handler: TimerHandler, timeout?: number | undefined) => {
  const timer = _originalSetTimeout(handler, timeout);
  timeoutTimers.push(timer);
  return timer;
};

function disposeTimers() {
  intervalTimers.forEach(timer => {
    try {
      clearInterval(timer);
    } catch (e) {}
  });
  timeoutTimers.forEach(timer => {
    try {
      clearTimeout(timer);
    } catch (e) {}
  });
  intervalTimers = [];
  timeoutTimers = [];
}

const GlobalErrorComponent = (props: ErrorProps) => {
  const error = props.error;
  const errorDetail = error
    ? `${error.stack}`
    : `No error information available`;

  return (
    <ErrorView
      title={error?.message || "An Error Occurred"}
      subheader=""
      emoji="😭"
      maxWidth={800}
      error={props.error}
      errorInfo={props.errorInfo}
      actions={null}
    >
      <Typography>{errorDetail}</Typography>
    </ErrorView>
  );
};

const GeneralSkeleton = () => (
  <Skeleton variant="rect" width="100%" height="100%" />
);

const Loading = (
  <Layout>
    <Row>
      <GeneralSkeleton />
      <GeneralSkeleton />
    </Row>
    <Row>
      <Column>
        <GeneralSkeleton />
      </Column>
      <Column>
        <GeneralSkeleton />
      </Column>
    </Row>
  </Layout>
);

const RuntimeRenderer = (props: {
  mod: any;
  error: Error | null;
}): JSX.Element => {
  const MainModule = useMemo(() => {
    if (props.error) {
      return <GlobalErrorComponent error={props.error} />;
    }
    if (!props.mod) {
      return Loading;
    }
    if (typeof props.mod !== "function") {
      return <GlobalErrorComponent />;
    }
    return props.mod as () => JSX.Element;
  }, [props.error, props.mod]);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Box
        position="absolute"
        width="100%"
        height="100%"
        className="RuntimeWrapper"
      >
        {MainModule}
      </Box>
    </div>
  );
};

const Runtime = () => {
  const [state, setState] = useState<{
    error: Error | null;
    module: Function | null;
  }>({ error: null, module: null });
  const { moduleUri, refreshRequestId } = useSandboxState();

  useEffect(() => {
    if (!moduleUri) {
      return;
    }
    const loadModule = async () => {
      try {
        disposeTimers();

        const module = await import(moduleUri + "?mtime=" + refreshRequestId);
        if (!module.default) {
          throw Error("module does not export a default function");
        }
        setState({ module: module.default, error: null });
      } catch (err) {
        setState({ module: null, error: err });
      }
    };

    loadModule();
  }, [moduleUri, refreshRequestId]);

  return (
    <ErrorBoundary
      fullPage
      errorComponent={GlobalErrorComponent}
      key={state.module?.toString()}
    >
      <RuntimeRenderer mod={state.module} error={state.error} />
    </ErrorBoundary>
  );
};

ReactDOM.render(
  <BrowserRouter>
    <StoreProvider>
      <Theme.ThemeSwitcher>
        <ErrorBoundary fullPage errorComponent={GlobalErrorComponent}>
          <Services>
            <Switch>
              <Route key="*" path="*" component={Runtime} />
            </Switch>
          </Services>
        </ErrorBoundary>
      </Theme.ThemeSwitcher>
    </StoreProvider>
  </BrowserRouter>,
  document.getElementById("root")
);
