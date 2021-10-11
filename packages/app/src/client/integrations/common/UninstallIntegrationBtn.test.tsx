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
import { UninstallBtn } from "./UninstallIntegrationBtn";
import userEvent from "@testing-library/user-event";
import { waitFor, screen } from "@testing-library/react";
import { Integration } from "state/integration/types";
import { createMemoryHistory } from "history";
import { Tenant } from "state/tenant/types";
import { graphql, rest } from "msw";
import { setupServer } from "msw/node";
import { renderWithEnv } from "client/utils/testutils";
import faker from "faker";
import { uniqueId } from "lodash";

const mockServer = setupServer();

const mockHasuraEndpoint = (integration: Integration) => {
  mockServer.use(
    graphql.mutation("DeleteIntegration", (req, res, ctx) => {
      return res(
        ctx.data({
          data: [{ id: integration.id }],
          error: null,
          loading: false
        })
      );
    })
  );
};

const mockGrafanaEndpoint = (tenant: Tenant, integration: Integration) => {
  mockServer.use(
    rest.delete(
      `http://${tenant.name}.localhost/grafana/api/folders/i9n-${integration.id}`,
      (req, res, ctx) => {
        return res(ctx.json({ id: 999 }));
      }
    )
  );
};

beforeAll(() => mockServer.listen());

beforeEach(() => {
  mockServer.resetHandlers();
});

afterAll(() => mockServer.close());

const getMockIntegration = (tenant: Tenant): Integration => {
  const id = uniqueId();
  const creationDate = faker.date.past().toString();
  return {
    id: id,
    tenant_id: tenant.id,
    name: `integration-name-${id}`,
    key: `integration-key-${id}`,
    kind: `integration-kind-${id}`,
    data: {},
    created_at: creationDate,
    updated_at: creationDate
  };
};

const getMockTenant = (): Tenant => {
  const id = uniqueId();
  const creationDate = faker.date.past().toString();
  return {
    id,
    name: `tenant-name-${id}`,
    key: `tenant-key-${id}`,
    type: `tenant-type-${id}`,
    created_at: creationDate,
    updated_at: creationDate
  };
};

test("handles click", async () => {
  const history = createMemoryHistory();

  const tenant = getMockTenant();
  const integration = getMockIntegration(tenant);

  mockHasuraEndpoint(integration);
  mockGrafanaEndpoint(tenant, integration);

  renderWithEnv(
    <UninstallBtn integration={integration} tenant={tenant} disabled={false} />,
    { history }
  );

  userEvent.click(
    screen.getByRole("button", { name: "Uninstall Integration" })
  );
  expect(screen.getByText(`Uninstall "${integration.name}"?`));
  userEvent.click(screen.getByText("yes"));

  // screen.debug()
  await waitFor(() =>
    expect(history.location.pathname).toBe(
      `/tenant/${tenant.name}/integrations/installed`
    )
  );
});

test("shows error messages if hasura request fails", async () => {
  const history = createMemoryHistory();

  const tenant = getMockTenant();
  const integration = getMockIntegration(tenant);
  const errorMessage = "Something went super wrong here!";
  mockServer.use(
    graphql.mutation("DeleteIntegration", (req, res, ctx) => {
      return res(
        ctx.errors([
          {
            message: "Something went super wrong here!"
          }
        ])
      );
    })
  );
  mockGrafanaEndpoint(tenant, integration);

  const container = renderWithEnv(
    <UninstallBtn integration={integration} tenant={tenant} disabled={false} />,
    { history }
  );

  userEvent.click(
    screen.getByRole("button", { name: "Uninstall Integration" })
  );
  expect(screen.getByText(`Uninstall "${integration.name}"?`));
  userEvent.click(screen.getByText("yes"));

  expect(
    await container.findByText("Could not uninstall integration")
  ).toBeInTheDocument();
  expect(await container.findByText(errorMessage)).toBeInTheDocument();
});

test("doesn't show error messages if grafana request fails", async () => {
  const history = createMemoryHistory();

  const tenant = getMockTenant();
  const integration = getMockIntegration(tenant);
  const errorMessage = "Folder API error";

  mockHasuraEndpoint(integration);
  // Grafana requests fails
  mockServer.use(
    rest.delete(
      `http://${tenant.name}.localhost/grafana/api/folders/i9n-${integration.id}`,
      (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ message: errorMessage }));
      }
    )
  );

  const container = renderWithEnv(
    <UninstallBtn integration={integration} tenant={tenant} disabled={false} />,
    { history }
  );

  userEvent.click(
    screen.getByRole("button", { name: "Uninstall Integration" })
  );
  expect(screen.getByText(`Uninstall "${integration.name}"?`));
  userEvent.click(screen.getByText("yes"));

  expect(container.queryAllByText(errorMessage)).toHaveLength(0);
});
