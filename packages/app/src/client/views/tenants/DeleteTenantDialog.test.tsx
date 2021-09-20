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
import { screen, waitFor } from "@testing-library/react";
import DeleteTenantDialog, {
  deleteTenantCommandId
} from "./DeleteTenantDialog";
import {
  CommandServiceTrigger,
  renderWithEnv,
  userEvent
} from "client/utils/testutils";
import { createMainStore } from "state/store";
import { graphql } from "msw";
import { setupServer } from "msw/node";
import faker from "faker";
import { Tenant } from "state/tenant/types";
import { setTenantList } from "state/tenant/actions";

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

const mockTenantDeletionEndpoint = (tenant: Tenant) => {
  const request = jest.fn();
  mockServer.use(
    graphql.mutation("DeleteTenant", (req, res, ctx) => {
      request(req.body!.variables);
      return res(
        ctx.data({
          data: { insert_tenant: { returning: [{ name: tenant.name }] } }
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

test("deletes tenant tenant", async () => {
  const store = createMainStore();
  const mockTenant = createMockTenant();

  store.dispatch(setTenantList([mockTenant]));

  const request = mockTenantDeletionEndpoint(mockTenant);

  renderWithEnv(
    <CommandServiceTrigger commandId={deleteTenantCommandId}>
      <DeleteTenantDialog />
    </CommandServiceTrigger>,
    { store }
  );
  expect(await screen.findByText("Enter tenant name")).toBeInTheDocument();
  const nameInput = screen.getByRole("textbox", { name: "picker filter" });
  userEvent.type(nameInput, mockTenant.name + "{enter}");

  expect(
    await screen.findByText(`Delete ${mockTenant.name}?`)
  ).toBeInTheDocument();
  userEvent.click(screen.getByText(`yes`));

  await waitFor(() =>
    expect(request).toHaveBeenCalledWith({ name: mockTenant.name })
  );
});

test("handles tenant deletion error", async () => {
  const store = createMainStore();
  const mockTenant = createMockTenant();
  const errorMessage = "Oh my - what an error!";

  store.dispatch(setTenantList([mockTenant]));

  mockServer.use(
    graphql.mutation("DeleteTenant", (req, res, ctx) => {
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
    <CommandServiceTrigger commandId={deleteTenantCommandId}>
      <DeleteTenantDialog />
    </CommandServiceTrigger>,
    { store }
  );
  expect(await screen.findByText("Enter tenant name")).toBeInTheDocument();
  const nameInput = screen.getByRole("textbox", { name: "picker filter" });
  userEvent.type(nameInput, mockTenant.name + "{enter}");

  expect(
    await screen.findByText(`Delete ${mockTenant.name}?`)
  ).toBeInTheDocument();
  userEvent.click(screen.getByText(`yes`));

  expect(
    await screen.findByText("Could not delete tenant")
  ).toBeInTheDocument();
  expect(await screen.findByText(errorMessage)).toBeInTheDocument();
});
