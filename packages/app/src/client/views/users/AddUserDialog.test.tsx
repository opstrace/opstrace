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

import React, { ReactNode, useEffect, useState } from "react";
import Services from "client/services";
import light from "client/themes/light";
import ThemeProvider from "client/themes/Provider";
import { StoreProvider } from "state/provider";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { Router } from "react-router-dom";
import AddUserDialog, { addUserCommandId } from "./AddUserDialog";
import { useCommandService } from "client/services/Command";
import { userEvent } from "client/utils/testutils";
import getStore from "state/store";
import { graphql } from "msw";
import { setupServer } from "msw/node";
import { User } from "state/graphql-api-types";
import { setUserList } from "state/user/actions";

const createMockUser = (userConfig: Partial<User> = {}): User => ({
  id: "2175de7c-c05d-4907-992d-81abfec79a8a",
  email: "asdasd@internet.cat",
  username: "asdasd@internet.cat",
  role: "user_admin",
  active: true,
  avatar: "",
  created_at: "2021-08-25T14:28:16.714233+00:00",
  session_last_updated: null,
  ...userConfig
});

const mockUserCreationEndpoint = (user: User) => {
  mockServer.use(
    graphql.mutation("CreateUser", (req, res, ctx) => {
      expect(req.body!.variables.email).toBe(user.email);
      return res(
        ctx.data({
          data: {
            update_user_by_pk: { user }
          }
        })
      );
    })
  );
};

const mockUserRecreationEndpoint = (user: User) => {
  mockServer.use(
    graphql.mutation("ReactivateUser", (req, res, ctx) => {
      const { id, active } = user;
      expect(req.body!.variables.id).toBe(id);
      return res(
        ctx.data({
          data: {
            insert_user_preference_one: { id, active }
          }
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

test("adds new user", async () => {
  const store = getStore();
  const mockUser = createMockUser();

  mockUserCreationEndpoint(mockUser);

  renderComponent(
    <CommandServiceTrigger>
      <AddUserDialog />
    </CommandServiceTrigger>,
    { store }
  );
  expect(await screen.findByText("Enter user's email")).toBeInTheDocument();
  const input = screen.getByRole("textbox", { name: "picker filter" });
  userEvent.type(input, mockUser.email + "{enter}");
});

test("reactivates users", async () => {
  const store = getStore();
  const mockUser = createMockUser({ active: false });

  store.dispatch(setUserList([mockUser]));

  mockUserRecreationEndpoint(mockUser);

  renderComponent(
    <CommandServiceTrigger>
      <AddUserDialog />
    </CommandServiceTrigger>,
    { store }
  );
  expect(await screen.findByText("Enter user's email")).toBeInTheDocument();
  const input = screen.getByRole("textbox", { name: "picker filter" });
  userEvent.type(input, mockUser.email + "{enter}");
});

test("handles when no name is entered", async () => {
  const username = "";
  renderComponent(
    <CommandServiceTrigger>
      <AddUserDialog />
    </CommandServiceTrigger>
  );
  expect(await screen.findByText("Enter user's email")).toBeInTheDocument();
  const input = screen.getByRole("textbox", { name: "picker filter" });
  userEvent.type(input, username + "{enter}");

  expect(screen.getByText("Enter new user's email")).toBeInTheDocument();
});

test("handles when name is no email", async () => {
  const username = "not an email";
  renderComponent(
    <CommandServiceTrigger>
      <AddUserDialog />
    </CommandServiceTrigger>
  );
  expect(await screen.findByText("Enter user's email")).toBeInTheDocument();
  const input = screen.getByRole("textbox", { name: "picker filter" });
  userEvent.type(input, username + "{enter}");

  expect(screen.getByText("It must be a valid email address")).toBeInTheDocument();
});

test.todo("handles user creation error");

test.todo("handles user reactivation error");

const CommandServiceTrigger = ({ children }: { children: ReactNode }) => {
  const cmdService = useCommandService();
  const [commandServiceReady, setCommandServiceReady] = useState(false);
  useEffect(() => {
    // CommandService is not ready on first render, as commands havent been registered yet.
    // This will retriger the command service on second render cycle.
    setCommandServiceReady(true);
  }, []);
  useEffect(() => {
    cmdService.executeCommand(addUserCommandId);
  }, [commandServiceReady, cmdService]);
  return <>{children}</>;
};

const renderComponent = (
  children: React.ReactNode,
  { store = getStore(), history = createMemoryHistory() } = {}
) => {
  return render(
    <StoreProvider>
      <ThemeProvider theme={light}>
        <Services>
          <Router history={history}>{children}</Router>
        </Services>
      </ThemeProvider>
    </StoreProvider>
  );
};
