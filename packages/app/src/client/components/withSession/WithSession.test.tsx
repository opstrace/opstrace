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

import React from "react";
import { Provider as StoreProvider } from "react-redux";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { rest } from "msw";
import { setupServer } from "msw/node";
import { createMainStore } from "state/store";
import ThemeProvider from "client/themes/Provider";
import light from "client/themes/light";
import { WithSession } from ".";
import faker from "faker";
import { getOpstraceConfig } from "state/opstrace-config/hooks/useOpstraceConfig";
import { Router } from "react-router-dom";
import { createMemoryHistory } from "history";
import { OpstraceBuildInfo } from "state/opstrace-config/types";

const makeMockBuildInfo = () => {
  return {
    branch: "some-branch",
    version: "fake-version",
    commit: "some-commit",
    buildTime: "2021-08-13 09:40:54+00:00",
    buildHostname: "ip-10-0-2-145.us-west-2.compute.internal"
  };
};

const mockAuthEndpoint = (buildInfo: OpstraceBuildInfo) => {
  mockServer.use(
    rest.get(`/_/auth/status`, (req, res, ctx) => {
      return res(
        ctx.json({
          currentUserId: `currentUserId-${faker.datatype.uuid()}`,
          auth0Config: {
            domain: faker.internet.domainName(),
            clientId: `client-id-${faker.datatype.uuid()}`
          },
          buildInfo
        })
      );
    })
  );
};

const mockServer = setupServer();

beforeAll(() => mockServer.listen());

beforeEach(() => {
  mockServer.resetHandlers();
});

afterAll(() => mockServer.close());

test("Login fetches and stores the buildInfo", async () => {
  const store = createMainStore();
  const buildInfo = makeMockBuildInfo();

  mockAuthEndpoint(buildInfo);

  renderComponent(
    <WithSession>
      <div></div>
    </WithSession>,
    { store }
  );

  await waitFor(() =>
    expect(getOpstraceConfig(store.getState())).toEqual({ buildInfo })
  );
});

test("Login handles transient errors", async () => {
  const store = createMainStore();

  mockServer.use(
    rest.get(`/_/auth/status`, (req, res, ctx) => {
      return res.networkError("Failed to connect");
    })
  );

  renderComponent(
    <WithSession>
      <div></div>
    </WithSession>,
    { store }
  );

  expect(
    await screen.findByText("GET /_/auth/status failed: Failed to connect")
  ).toBeInTheDocument();
});

test("Login handles unexpected responses", async () => {
  const store = createMainStore();

  mockServer.use(
    rest.get(`/_/auth/status`, (req, res, ctx) => {
      return res(ctx.status(500), ctx.json({}));
    })
  );

  renderComponent(
    <WithSession>
      <div></div>
    </WithSession>,
    { store }
  );

  expect(
    await screen.findByText(
      "GET /_/auth/status failed: got an unexpected response with status code 500"
    )
  ).toBeInTheDocument();
});

const renderComponent = (
  children: React.ReactNode,
  { store = createMainStore() } = {}
) => {
  return render(
    <Router history={createMemoryHistory()}>
      <StoreProvider store={store}>
        <ThemeProvider theme={light}>{children}</ThemeProvider>
      </StoreProvider>
    </Router>
  );
};
