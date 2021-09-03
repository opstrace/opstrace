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
import Services from "client/services";
import light from "client/themes/light";
import ThemeProvider from "client/themes/Provider";
import { StoreProvider } from "state/provider";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { Router } from "react-router-dom";
import AddTenantDialog, { addTenantCommandId } from "./AddTenantDialog";
import { CommandServiceTrigger, userEvent } from "client/utils/testutils";
import getStore from "state/store";
import { graphql } from "msw";
import { setupServer } from "msw/node";
import faker from "faker";
import { Tenant } from "state/tenant/types";

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

const mockTenantCreationEndpoint = (tenant: Tenant) => {
  const request = jest.fn();
  mockServer.use(
    graphql.mutation("CreateTenants", (req, res, ctx) => {
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

test("adds new tenant", async () => {
  const store = getStore();
  const mockTenant = createMockTenant();

  const request = mockTenantCreationEndpoint(mockTenant);

  renderComponent(
    <CommandServiceTrigger commandId={addTenantCommandId}>
      <AddTenantDialog />
    </CommandServiceTrigger>,
    { store }
  );
  expect(await screen.findByText("Enter tenant name")).toBeInTheDocument();
  const input = screen.getByRole("textbox", { name: "picker filter" });
  userEvent.type(input, mockTenant.name + "{enter}");

  await waitFor(() =>
    expect(request).toHaveBeenCalledWith({
      tenants: [{ name: mockTenant.name }]
    })
  );
});

test("handles when no name is entered", async () => {
  const tenantname = "";
  renderComponent(
    <CommandServiceTrigger commandId={addTenantCommandId}>
      <AddTenantDialog />
    </CommandServiceTrigger>
  );
  expect(await screen.findByText("Enter tenant name")).toBeInTheDocument();
  const input = screen.getByRole("textbox", { name: "picker filter" });
  userEvent.type(input, tenantname + "{enter}");

  expect(screen.getByText("Enter new Tenant name")).toBeInTheDocument();
});

test("handles when name is too short", async () => {
  const tenantname = "a";
  renderComponent(
    <CommandServiceTrigger commandId={addTenantCommandId}>
      <AddTenantDialog />
    </CommandServiceTrigger>
  );
  expect(await screen.findByText("Enter tenant name")).toBeInTheDocument();
  const input = screen.getByRole("textbox", { name: "picker filter" });
  userEvent.type(input, tenantname + "{enter}");

  expect(
    screen.getByText("2 or more lowercase alpha-numeric characters")
  ).toBeInTheDocument();
});

test("handles when name is invalid", async () => {
  const tenantname = "$$$";
  renderComponent(
    <CommandServiceTrigger commandId={addTenantCommandId}>
      <AddTenantDialog />
    </CommandServiceTrigger>
  );
  expect(await screen.findByText("Enter tenant name")).toBeInTheDocument();
  const input = screen.getByRole("textbox", { name: "picker filter" });
  userEvent.type(input, tenantname + "{enter}");

  expect(
    screen.getByText("2 or more lowercase alpha-numeric characters")
  ).toBeInTheDocument();
});

test("handles tenant creation error", async () => {
  const store = getStore();
  const mockTenant = createMockTenant();
  const errorMessage = "Oh my - what an error!";

  mockServer.use(
    graphql.mutation("CreateTenants", (req, res, ctx) => {
      return res(
        ctx.errors([
          {
            message: errorMessage
          }
        ])
      );
    })
  );

  renderComponent(
    <CommandServiceTrigger commandId={addTenantCommandId}>
      <AddTenantDialog />
    </CommandServiceTrigger>,
    { store }
  );
  expect(await screen.findByText("Enter tenant name")).toBeInTheDocument();
  const input = screen.getByRole("textbox", { name: "picker filter" });
  userEvent.type(input, mockTenant.name + "{enter}");

  expect(await screen.findByText("Could not add tenant")).toBeInTheDocument();
  expect(await screen.findByText(errorMessage)).toBeInTheDocument();
});

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
