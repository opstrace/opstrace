import React from "react";
import { render as rtlRender, RenderResult } from "@testing-library/react";
import { History, createMemoryHistory } from "history";
import { Router } from "react-router-dom";
import UE from "@testing-library/user-event";

export type RenderOptions = {
  // optionally pass in a history object to control routes in the test
  history?: History;
};

type WrapperProps = {
  children?: React.ReactNode;
};

export function render(
  ui: React.ReactNode,
  renderOptions?: RenderOptions
): RenderResult {
  function Wrapper({ children }: WrapperProps) {
    return (
      <React.StrictMode>
        <Router
          history={
            (renderOptions && renderOptions.history) || createMemoryHistory()
          }
        >
          {children}
        </Router>
      </React.StrictMode>
    );
  }

  return rtlRender(<div>{ui}</div>, { wrapper: Wrapper, ...renderOptions });
}

export function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// re-export everything
export * from "@testing-library/react";
export const userEvent = UE;
