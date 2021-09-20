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
import { InstallIntegration } from "./Install";
import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { Route } from "react-router-dom";
import { renderWithEnv, userEvent } from "client/utils/testutils";
import { IntegrationDef, integrationsDefs } from "client/integrations";
import { Tenant } from "state/tenant/types";
import { Integration } from "state/integration/types";
import { graphql } from "msw";
import { setupServer } from "msw/node";
import uniqueId from "lodash/uniqueId";

const getMockIntegration = (
  integrationDef: IntegrationDef,
  tenant: Tenant,
  id = uniqueId()
): Integration => ({
  id,
  tenant_id: tenant.id,
  name: `integration-${id}-name`,
  key: `integration-${id}-key`,
  kind: integrationDef.kind,
  data: {},
  created_at: `integration-${id}-created_at`,
  updated_at: `integration-${id}-updated_at`
});

const getMockTenant = (id = uniqueId()): Tenant => ({
  id,
  name: `tenant-${id}-name`,
  key: `tenant-${id}-key`,
  type: `tenant-${id}-type`,
  created_at: `tenant-${id}-created_at`,
  updated_at: `tenant-${id}-updated_at`
});

const mockServer = setupServer();

const mockHasuraEndpoint = (tenant: Tenant, integration: Integration) => {
  mockServer.use(
    graphql.mutation("InsertIntegration", (req, res, ctx) => {
      return res(
        ctx.data({
          insert_integration_one: integration
        })
      );
    })
  );
};

beforeAll(() => mockServer.listen());

beforeEach(() => {
  mockServer.resetHandlers();
});

afterAll(() => mockServer.close());

test("installs integrations and reroutes", async () => {
  const integrationDef = integrationsDefs[0];
  const tenant = getMockTenant();
  const integration = getMockIntegration(integrationDef, tenant);
  const startUrl = `/tenant/${tenant.name}/integrations/all/install/${integrationDef.kind}`;
  const history = createMemoryHistory({ initialEntries: [startUrl] });

  mockHasuraEndpoint(tenant, integration);

  renderComponent(<InstallIntegration />, { history });
  userEvent.type(screen.getAllByRole("textbox")[0], "my-new-installation");
  userEvent.click(screen.getByRole("button", { name: "Install" }));
  await waitFor(() =>
    expect(history.location.pathname).toBe(
      `/tenant/system/integrations/installed/${integration.id}`
    )
  );
});

test("renders 404 on unknown integration", () => {
  const startUrl = `/tenant/system/integrations/all/install/doesnt-exist`;
  const history = createMemoryHistory({ initialEntries: [startUrl] });
  renderComponent(<InstallIntegration />, { history });
  expect(screen.getByText("That's a 404")).toBeInTheDocument();
});

test("handles error when inserting new integration", async () => {
  const integrationDef = integrationsDefs[0];
  const tenant = getMockTenant();
  const startUrl = `/tenant/${tenant.name}/integrations/all/install/${integrationDef.kind}`;
  const history = createMemoryHistory({ initialEntries: [startUrl] });
  const errorMessage = "Something went super wrong here!";

  mockServer.use(
    graphql.mutation("InsertIntegration", (req, res, ctx) => {
      return res(
        ctx.errors([
          {
            message: "Something went super wrong here!"
          }
        ])
      );
    })
  );

  renderComponent(<InstallIntegration />, { history });
  userEvent.type(screen.getAllByRole("textbox")[0], "my-new-installation");
  userEvent.click(screen.getByRole("button", { name: "Install" }));

  expect(
    await screen.findByText("Could not install integration")
  ).toBeInTheDocument();
  expect(await screen.findByText(errorMessage)).toBeInTheDocument();
});

// Right now we do not have any integrations that create a folder on installation
test.todo("handles error when getting grafana folder");

const renderComponent = (
  children: React.ReactNode,
  { history = createMemoryHistory() } = {}
) => {
  return renderWithEnv(
    <Route path="/tenant/:tenantId/integrations/all/install/:integrationKind">
      {children}
    </Route>,
    { history }
  );
};
