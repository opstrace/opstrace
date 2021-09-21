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
import { ThemeCommands, toggleDarkModeCommandId } from "./Provider";
import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import { CommandServiceTrigger, renderWithEnv } from "../utils/testutils";
import { createMainStore } from "../../state/store";
import { graphql, rest } from "msw";
import { setupServer } from "msw/node";
import faker from "faker";
import { setCurrentUser, setUserList } from "../../state/user/actions";
import { User } from "../../state/graphql-api-types";
import { getCurrentUser } from "../../state/user/hooks/useCurrentUser";
import { setTenantList } from "../../state/tenant/actions";
import { Tenant } from "../../state/tenant/types";
import { grafanaUrl } from "../utils/grafana";

const createMockTenant = (config: Partial<Tenant> = {}): Tenant => {
  const name = faker.internet.domainWord();
  return {
    id: faker.datatype.uuid(),
    created_at: "2021-08-25T14:28:16.714233+00:00",
    updated_at: "2021-08-25T14:28:16.714233+00:00",
    key: name,
    name: name,
    type: "USER",
    ...config
  };
};

const createMockUser = (userConfig: Partial<User> = {}): User => {
  const email = faker.internet.email();
  return {
    id: faker.datatype.uuid(),
    email: email,
    username: email,
    role: "user_admin",
    active: true,
    avatar: "",
    created_at: "2021-08-25T14:28:16.714233+00:00",
    preference: {
      dark_mode: false,
      id: faker.datatype.uuid()
    },
    ...userConfig
  };
};

const mockGrafanaDarkModeEndpoint = (tenant: Tenant) => {
  const requestSpy = jest.fn();
  mockServer.use(
    rest.put(
      `${grafanaUrl({ tenant })}/grafana/api/user/preferences`,
      (req, res, ctx) => {
        requestSpy(req.body);
        return res(ctx.json({ message: "Preferences updated" }));
      }
    )
  );
  return requestSpy;
};

const mockGraphQLDarkModeRequest = () => {
  const request = jest.fn();
  mockServer.use(
    graphql.mutation("SetDarkMode", (req, res, ctx) => {
      request(req.body!.variables);
      return res(
        ctx.data({
          update_user_preference: { returning: [{ dark_mode: true }] }
        })
      );
    })
  );
  return request;
};

const mockServer = setupServer();

beforeAll(() => mockServer.listen());

beforeEach(() => {
  mockServer.resetHandlers();
});

afterAll(() => mockServer.close());

test("ThemeCommands activates dark mode", async () => {
  const store = createMainStore();

  const currentUser = createMockUser();
  const tenant = createMockTenant();

  store.dispatch(setUserList([currentUser]));
  store.dispatch(setCurrentUser(currentUser.id));
  store.dispatch(setTenantList([tenant]));

  const grafanaRequestBodySpy = mockGrafanaDarkModeEndpoint(tenant);
  const gqlRequestBodySpy = mockGraphQLDarkModeRequest();

  renderWithEnv(
    <CommandServiceTrigger commandId={toggleDarkModeCommandId}>
      <ThemeCommands>
        <></>
      </ThemeCommands>
    </CommandServiceTrigger>,
    { store }
  );

  // initially dark mode is off
  expect(getCurrentUser(store.getState()).preference!.dark_mode).toBe(false);

  // but it is set to true via command
  // In this test the `CommandServiceTrigger` will automaticly trigger the command
  await waitFor(() =>
    expect(getCurrentUser(store.getState()).preference?.dark_mode).toBe(true)
  );

  expect(grafanaRequestBodySpy).toHaveBeenCalledWith({
    theme: "dark",
    homeDashboardId: 0,
    timezone: ""
  });

  expect(gqlRequestBodySpy).toHaveBeenCalledWith({
    dark_mode: true,
    user_id: currentUser.id
  });
});

test("ThemeCommands handles grafana errors", async () => {
  const tenant = createMockTenant();
  mockServer.use(
    rest.put(
      `${grafanaUrl({ tenant })}/grafana/api/user/preferences`,
      (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ message: errorMessage }));
      }
    )
  );
  mockGraphQLDarkModeRequest();
  const store = createMainStore();

  const currentUser = createMockUser();

  const errorMessage = "OH NO!";

  store.dispatch(setUserList([currentUser]));
  store.dispatch(setCurrentUser(currentUser.id));
  store.dispatch(setTenantList([tenant]));

  renderWithEnv(
    <CommandServiceTrigger commandId={toggleDarkModeCommandId}>
      <ThemeCommands>
        <></>
      </ThemeCommands>
    </CommandServiceTrigger>,
    { store }
  );

  expect(getCurrentUser(store.getState()).preference!.dark_mode).toBe(false);

  expect(
    await screen.findByText(
      "Could not persist dark mode preferences in grafana"
    )
  ).toBeInTheDocument();
  expect(await screen.findByText(errorMessage)).toBeInTheDocument();
});

test("ThemeCommands handles graphql errors", async () => {
  const store = createMainStore();

  const currentUser = createMockUser();
  const tenant = createMockTenant();

  const errorMessage = "OH NO!";

  store.dispatch(setUserList([currentUser]));
  store.dispatch(setCurrentUser(currentUser.id));
  store.dispatch(setTenantList([tenant]));

  mockGrafanaDarkModeEndpoint(tenant);
  mockServer.use(
    graphql.mutation("SetDarkMode", (req, res, ctx) => {
      return res(
        ctx.errors([
          {
            message: errorMessage
          }
        ])
      );
    })
  );

  renderWithEnv(
    <CommandServiceTrigger commandId={toggleDarkModeCommandId}>
      <ThemeCommands>
        <></>
      </ThemeCommands>
    </CommandServiceTrigger>,
    { store }
  );

  expect(
    await screen.findByText("Could not persist dark mode preferences in hasura")
  ).toBeInTheDocument();
  expect(await screen.findByText(errorMessage)).toBeInTheDocument();
});
