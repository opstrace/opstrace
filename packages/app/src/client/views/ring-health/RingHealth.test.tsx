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
import RingHealth from "./RingHealth";
import Services from "client/services";
import light from "client/themes/light";
import ThemeProvider from "client/themes/Provider";
import { StoreProvider } from "state/provider";
import nock from "nock";
import { MemoryRouter } from "react-router";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/react";
import { createMockShard } from "./testUtils";

jest.useFakeTimers();

beforeEach(() => {
  // @ts-ignore
  nock.cleanAll();
});

describe("RingHealth", () => {
  test("renders title correctly", async () => {
    const title = "my title";
    const container = renderComponent(
      <RingHealth
        title={title}
        tabs={[
          {
            title: "Something",
            path: `/something`,
            endpoint: "/something-endpoint"
          }
        ]}
      />
    );

    const ingesterTab = container.getByRole("heading");
    expect(ingesterTab).toHaveTextContent(title);
  });

  test("has selectable tabs", async () => {
    const firstTabName = "First Tab";
    const secondTabName = "Second Tab";
    const tabs = [
      {
        title: firstTabName,
        path: `/first`,
        endpoint: "/first-endpoint"
      },
      {
        title: secondTabName,
        path: `/second`,
        endpoint: "/second-endpoint"
      }
    ];
    const container = renderComponent(
      <RingHealth title="some title" tabs={tabs} />
    );

    const firstTab = container.getByRole("tab", { name: firstTabName });
    const secondTab = container.getByRole("tab", { name: secondTabName });

    expect(firstTab).toHaveAttribute("aria-selected", "true");
    expect(secondTab).toHaveAttribute("aria-selected", "false");

    userEvent.click(secondTab);
    const firstTabAfterClick = container.getByRole("tab", {
      name: firstTabName
    });
    const secondTabAfterClick = container.getByRole("tab", {
      name: secondTabName
    });
    expect(firstTabAfterClick).toHaveAttribute("aria-selected", "false");
    expect(secondTabAfterClick).toHaveAttribute("aria-selected", "true");
  });

  test("loads table", async () => {
    const tab = {
      title: "Tab",
      path: `/tab`,
      endpoint: "/tab-endpoint"
    };
    const mockShard = createMockShard("first-shard");
    mockShard.tokens = [111, 222, 333];
    nock("http://localhost")
      .get(tab.endpoint)
      .reply(200, {
        shards: [mockShard],
        now: Date.now()
      });

    const container = renderComponent(
      <RingHealth title="some title" tabs={[tab]} />
    );

    // wait for polling
    jest.runOnlyPendingTimers();

    // assert table is rendered properly
    expect(
      await container.findByRole("cell", { name: mockShard.id })
    ).toBeInTheDocument();
    expect(
      await container.findByRole("cell", { name: mockShard.state })
    ).toBeInTheDocument();
    expect(
      await container.findByRole("cell", { name: mockShard.zone })
    ).toBeInTheDocument();
    expect(
      await container.findByRole("cell", { name: mockShard.address })
    ).toBeInTheDocument();

    // assert token dialog
    const tokenDialogButton = container.getAllByRole("button", {
      name: "show token dialog"
    })[0];
    userEvent.click(tokenDialogButton);
    expect(await container.findByText(mockShard.tokens[0])).toBeInTheDocument();
    expect(await container.findByText(mockShard.tokens[1])).toBeInTheDocument();
    expect(await container.findByText(mockShard.tokens[2])).toBeInTheDocument();
  });

  test("fetches new results every 2s", async () => {
    const tab = {
      title: "Tab",
      path: `/tab`,
      endpoint: "/tab-endpoint"
    };
    const firstBatch = [createMockShard("some-shard")];
    nock("http://localhost").get(tab.endpoint).reply(200, {
      shards: firstBatch,
      now: Date.now()
    });

    const container = renderComponent(
      <RingHealth title="some title" tabs={[tab]} />
    );

    // wait for polling
    jest.runOnlyPendingTimers();

    // assert table is rendered properly
    expect(
      await container.findByRole("cell", { name: firstBatch[0].id })
    ).toBeInTheDocument();

    const secondBatch = [createMockShard("some-other-shard")];
    nock("http://localhost").get(tab.endpoint).reply(200, {
      shards: secondBatch,
      now: Date.now()
    });

    // wait for polling
    jest.advanceTimersByTime(2000);
    expect(
      await container.findByRole("cell", { name: secondBatch[0].id })
    ).toBeInTheDocument();
  });
});

test("handles request errors", async () => {
  const tab = {
    title: "Tab",
    path: `/tab`,
    endpoint: "/tab-endpoint"
  };

  nock("http://localhost").get(tab.endpoint).reply(500);

  const container = renderComponent(
    <RingHealth title="some title" tabs={[tab]} />
  );

  jest.runOnlyPendingTimers();

  expect(
    await container.findByText("Could not load table")
  ).toBeInTheDocument();
  expect(
    await container.findByText("Request failed with status code 500")
  ).toBeInTheDocument();
});

const renderComponent = (children: React.ReactNode) => {
  return render(
    <StoreProvider>
      <ThemeProvider theme={light}>
        <Services>
          <MemoryRouter>{children}</MemoryRouter>
        </Services>
      </ThemeProvider>
    </StoreProvider>
  );
};
