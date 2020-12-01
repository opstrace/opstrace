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
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

// re-export everything
export * from "@testing-library/react";
export const userEvent = UE;
