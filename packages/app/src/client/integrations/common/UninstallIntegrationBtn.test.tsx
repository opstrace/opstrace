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

import React, { ReactNode } from "react";
import { UninstallBtn } from "./UninstallIntegrationBtn";
import Services from "client/services";
import light from "client/themes/light";
import ThemeProvider from "client/themes/Provider";
import { StoreProvider } from "state/provider";
import nock from "nock";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { render, waitFor } from "@testing-library/react";
import { Integration } from "state/integration/types";
import { createMemoryHistory } from "history";
import { Tenant } from "state/tenant/types";
import { Router } from "react-router-dom";
import { graphql, rest } from "msw";
import { setupServer } from "msw/node";

/* did not manage to get the picker service running with the tests
 * so I just mocked it, as I primarily want to test network interactions.
 */
jest.mock("client/services/Picker", () => ({
  PickerService: ({ children }: { children: ReactNode }) => children,
  usePickerService: ({ onSelected }: { onSelected: Function }) => ({
    activatePickerWithText: () => onSelected({ id: "yes" })
  })
}));

const mockServer = setupServer();

const mockHasuraEndpoint = () => {
  mockServer.use(
    graphql.mutation("DeleteIntegration", (req, res, ctx) => {
      return res(
        ctx.data({
          data: [{ id: 1 }],
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
  nock.cleanAll();
  mockServer.resetHandlers();
});

afterAll(() => mockServer.close());

const getMockIntegration = (): Integration => ({
  id: 1,
  tenant_id: 2,
  name: "mock-integration",
  key: "some-key",
  kind: "some-kind",
  data: {},
  created_at: "today",
  updated_at: "tomorrow"
});

const getMockTenant = (): Tenant => ({
  id: 4,
  name: "mock-tenant",
  key: "some-key",
  type: "some-type",
  created_at: "today",
  updated_at: "tomorrow"
});

test("handles click", async () => {
  const history = createMemoryHistory();

  const integration = getMockIntegration();
  const tenant = getMockTenant();

  mockHasuraEndpoint();
  mockGrafanaEndpoint(tenant, integration);

  const container = renderComponent(
    <UninstallBtn integration={integration} tenant={tenant} disabled={false} />,
    history
  );

  userEvent.click(container.getByRole("button"));
  await waitFor(() =>
    expect(history.location.pathname).toBe(
      "/tenant/mock-tenant/integrations/installed"
    )
  );
});

test("shows error messages if hasura request fails", async () => {
  const history = createMemoryHistory();

  const integration = getMockIntegration();
  const tenant = getMockTenant();
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

  const container = renderComponent(
    <UninstallBtn integration={integration} tenant={tenant} disabled={false} />,
    history
  );

  userEvent.click(container.getByRole("button"));
  expect(
    await container.findByText("Could not uninstall integration")
  ).toBeInTheDocument();
  expect(await container.findByText(errorMessage)).toBeInTheDocument();
});

test("doesn't show error messages if grafana request fails", async () => {
  const history = createMemoryHistory();

  const integration = getMockIntegration();
  const tenant = getMockTenant();
  const errorMessage = "Folder API error";

  mockHasuraEndpoint();
  // Grafana requests fails
  mockServer.use(
    rest.delete(
      `http://${tenant.name}.localhost/grafana/api/folders/i9n-${integration.id}`,
      (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ message: errorMessage }));
      }
    )
  );

  const container = renderComponent(
    <UninstallBtn integration={integration} tenant={tenant} disabled={false} />,
    history
  );

  userEvent.click(container.getByRole("button"));
  expect(await container.findByText(errorMessage)).not.toBeInTheDocument();
});

const renderComponent = (
  children: React.ReactNode,
  history = createMemoryHistory()
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
