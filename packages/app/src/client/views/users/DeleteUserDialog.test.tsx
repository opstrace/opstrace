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
import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import DeleteUserDialog, { deleteUserCommand } from "./DeleteUserDialog";
import {
  CommandServiceTrigger,
  renderWithEnv,
  userEvent
} from "client/utils/testutils";
import { createMainStore } from "state/store";
import { graphql } from "msw";
import { setupServer } from "msw/node";
import { User } from "state/graphql-api-types";
import { setUserList } from "state/user/actions";
import uniqueId from "lodash/uniqueId";

const createMockUser = (userConfig: Partial<User> = {}): User => ({
  id: uniqueId(),
  email: "asdasd@internet.cat",
  username: "asdasd@internet.cat",
  role: "user_admin",
  active: true,
  avatar: "",
  created_at: "2021-08-25T14:28:16.714233+00:00",
  session_last_updated: null,
  ...userConfig
});

const mockUserDeactivationEndpoint = (user: User) => {
  mockServer.use(
    graphql.mutation("DeactivateUser", (req, res, ctx) => {
      expect(req.body!.variables.id).toBe(user.id);
      return res(
        ctx.data({
          data: {
            update_user_by_pk: {
              id: user.id,
              active: false
            }
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

test("deactivates users", async () => {
  const store = createMainStore();
  const mockUser = createMockUser();

  store.dispatch(setUserList([mockUser]));

  mockUserDeactivationEndpoint(mockUser);

  renderWithEnv(
    <CommandServiceTrigger commandId={deleteUserCommand}>
      <DeleteUserDialog />
    </CommandServiceTrigger>,
    { store }
  );
  expect(await screen.findByText("Enter user's email")).toBeInTheDocument();

  // enter user email and hit enter
  const userNameInput = screen.getByRole("textbox", { name: "picker filter" });
  userEvent.type(userNameInput, mockUser.email + "{enter}");

  expect(
    await screen.findByText(`Delete ${mockUser.email}?`)
  ).toBeInTheDocument();

  // confirm
  const confirmationInput = screen.getByRole("textbox", {
    name: "picker filter"
  });
  userEvent.type(confirmationInput, "yes{enter}");
});

test("handles user deactivation error", async () => {
  const store = createMainStore();
  const mockUser = createMockUser();
  const errorMessage = "terrible error!";

  store.dispatch(setUserList([mockUser]));

  mockServer.use(
    graphql.mutation("DeactivateUser", (req, res, ctx) => {
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
    <CommandServiceTrigger commandId={deleteUserCommand}>
      <DeleteUserDialog />
    </CommandServiceTrigger>,
    { store }
  );
  expect(await screen.findByText("Enter user's email")).toBeInTheDocument();

  // enter user email and hit enter
  const userNameInput = screen.getByRole("textbox", { name: "picker filter" });
  userEvent.type(userNameInput, mockUser.email + "{enter}");

  expect(
    await screen.findByText(`Delete ${mockUser.email}?`)
  ).toBeInTheDocument();

  // confirm
  const confirmationInput = screen.getByRole("textbox", {
    name: "picker filter"
  });
  userEvent.type(confirmationInput, "yes{enter}");

  expect(await screen.findByText("Could not delete user")).toBeInTheDocument();
  expect(await screen.findByText(errorMessage)).toBeInTheDocument();
});
