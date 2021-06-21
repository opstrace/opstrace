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
import RingHealth, { TABS } from ".";
import Services from "client/services";
import light from "client/themes/light";
import ThemeProvider from "client/themes/Provider";
import { StoreProvider } from "state/provider";
import nock from "nock";
import { Router } from "react-router";
import { createMemoryHistory } from "history";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/react";
import { createMockShard } from "../testUtils";

jest.useFakeTimers();

beforeEach(() => {
  // @ts-ignore
  nock.cleanAll();
  // mocking requests made on initial rendering
  nock("http://localhost").get("/_/loki/ingester/ring").reply(200, {
    shards: [],
    now: Date.now()
  });
});

describe("LokiRingHealth", () => {
  test("renders title correctly", async () => {
    const baseUrl = "/route/to/ring-health";
    const history = createMemoryHistory({ initialEntries: [baseUrl] });
    const container = renderComponent(
      <Router history={history}>
        <RingHealth baseUrl={baseUrl} />
      </Router>
    );

    const ingesterTab = container.getByRole("heading");
    expect(ingesterTab).toHaveTextContent("Loki Ring Health");
  });

  test("selects ingester tab by default", async () => {
    const baseUrl = "/route/to/ring-health";
    const history = createMemoryHistory({ initialEntries: [baseUrl] });
    const container = renderComponent(
      <Router history={history}>
        <RingHealth baseUrl={baseUrl} />
      </Router>
    );

    const ingesterTab = container.getByRole("tab", { name: "Ingester" });
    expect(ingesterTab).toHaveAttribute("aria-selected", "true");
    expect(history.location.pathname).toBe(baseUrl + "/ingester");
  });

  const tabTestCases = TABS.map(({ title, path, endpoint }) => [
    title,
    path,
    endpoint
  ]);
  describe("tabs", () => {
    test.each(tabTestCases)(
      "%s tab",
      async (tabLabel, tabRoute, tabEndpoint) => {
        const mockShard = createMockShard("some-shard");
        nock("http://localhost")
          .get(tabEndpoint)
          .reply(200, {
            shards: [mockShard],
            now: Date.now()
          });

        const baseUrl = "/route/to/ring-health";
        const history = createMemoryHistory({ initialEntries: [baseUrl] });
        const container = renderComponent(
          <Router history={history}>
            <RingHealth baseUrl={baseUrl} />
          </Router>
        );

        // wait for polling
        jest.runOnlyPendingTimers();

        // Select tab
        const ingesterTab = container.getByRole("tab", { name: tabLabel });
        userEvent.click(ingesterTab);

        // wait for polling
        jest.runOnlyPendingTimers();

        // assert that reroute was successful
        await container.findByRole("tab", { name: tabLabel, selected: true });
        expect(history.location.pathname).toBe(baseUrl + tabRoute);

        // assert table is rendered properly
        expect(
          await container.findByRole("cell", { name: mockShard.id })
        ).toBeInTheDocument();
      }
    );
  });
});

const renderComponent = (children: React.ReactNode) => {
  return render(
    <StoreProvider>
      <ThemeProvider theme={light}>
        <Services>{children}</Services>
      </ThemeProvider>
    </StoreProvider>
  );
};
