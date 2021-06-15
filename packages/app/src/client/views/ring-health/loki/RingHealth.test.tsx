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

const createMockShards = () => {
  function getRandomInt() {
    return Math.floor(Math.random() * 1000);
  }
  return new Array(5).fill(true).map(() => {
    const id = getRandomInt();
    return {
      id: `shard-id-${id}`,
      state: `shard-state-${id}`,
      timestamp: "2021-05-31T13:02:47+00:00",
      zone: `shard-zone-${id}`,
      address: `shard-address-${id}`,
      tokens: [
        `shard-token-${id}-a`,
        `shard-token-${id}-b`,
        `shard-token-${id}-c`
      ],
      registered_timestamp: `shard-registered_timestamp-${id}`
    };
  });
};

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

  test("selects first tab by default", async () => {
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
  test.each(tabTestCases)(
    "%s tab",
    async (tabLabel, tabRoute, tabEndpoint) => {
      const mockShards = createMockShards();
      nock("http://localhost").get(tabEndpoint).reply(200, {
        shards: mockShards,
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
        await container.findByRole("cell", { name: mockShards[0].id })
      ).toBeInTheDocument();
      expect(
        await container.findByRole("cell", { name: mockShards[0].state })
      ).toBeInTheDocument();
      expect(
        await container.findByRole("cell", { name: mockShards[0].zone })
      ).toBeInTheDocument();
      expect(
        await container.findByRole("cell", { name: mockShards[0].address })
      ).toBeInTheDocument();

      // assert token dialog
      const tokenDialogButton = container.getAllByRole("button", {
        name: "show token dialog"
      })[0];
      userEvent.click(tokenDialogButton);
      expect(
        await container.findByText(mockShards[0].tokens[0])
      ).toBeInTheDocument();
      expect(
        await container.findByText(mockShards[0].tokens[1])
      ).toBeInTheDocument();
      expect(
        await container.findByText(mockShards[0].tokens[2])
      ).toBeInTheDocument();
    }
  );
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
