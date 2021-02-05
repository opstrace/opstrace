/**
 * This module will not be available to users of the SDK.
 */

import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { BrowserRouter } from "react-router-dom";
import { Route, Switch } from "react-router";
import Skeleton from "@material-ui/lab/Skeleton";
import { Box } from "client/components/Box";
import AutoSizer, { Size } from "react-virtualized-auto-sizer";
import Layout from "client/components/Layout/Layout";
import { row } from "client/components/Layout/Row";
import { column } from "client/components/Layout/Column";
import { ErrorView } from "client/components/Error";
import ErrorBoundary, { ErrorProps } from "client/components/Error/Boundary";
import { Scrollable } from "client/components/Scrollable";
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

const LayoutEngine = (props: {
  mod: any;
  error: Error | null;
}): JSX.Element => {
  const loading = row([
    column([<GeneralSkeleton />, <GeneralSkeleton />]),
    column([<GeneralSkeleton />, <GeneralSkeleton />])
  ]);

  const [main, setMain] = useState<any>(loading);

  useEffect(() => {
    if (props.error) {
      return setMain(<GlobalErrorComponent error={props.error} />);
    }
    if (!props.mod) {
      return setMain(loading);
    }
    if (typeof props.mod !== "function") {
      return setMain(<GlobalErrorComponent />);
    }
  }, [props.error, props.mod]);

  useEffect(() => {
    if (!props.mod) {
      return;
    }
    const invokeModule = async () => {
      try {
        const res = await props.mod();
        if (typeof res === "undefined") {
          setMain(
            <ErrorView
              title="Undefined return value"
              subheader=""
              emoji="👻"
              maxWidth={400}
              actions={null}
            >
              <Typography>Default function doesn't return anything</Typography>
            </ErrorView>
          );
        } else {
          setMain(res);
        }
      } catch (err) {
        setMain(<GlobalErrorComponent error={err} />);
      }
    };
    invokeModule();
  }, [props.mod]);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <AutoSizer>
        {({ height, width }: Size) => {
          return (
            <Box position="absolute" width="100%" height="100%">
              <Scrollable>
                <Box
                  p={0}
                  justifyContent="left"
                  alignItems="normal"
                  data-testid="module-output"
                >
                  <Layout minHeight={height} width={width}>
                    {main}
                  </Layout>
                </Box>
              </Scrollable>
            </Box>
          );
        }}
      </AutoSizer>
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
    <ErrorBoundary fullPage errorComponent={GlobalErrorComponent}>
      <LayoutEngine mod={state.module} error={state.error} />
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
