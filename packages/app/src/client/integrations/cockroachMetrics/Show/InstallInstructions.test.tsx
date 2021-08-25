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
import { InstallInstructions } from "./InstallInstructions";
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
import { rest } from "msw";
import { setupServer } from "msw/node";
import uniqueId from "lodash/uniqueId";
import * as integrationActions from "state/integration/actions";

const mockServer = setupServer();

const mockCreateGrafanaFolderEndpoint = (tenant: Tenant, folderId: string) => {
  // Create folder
  mockServer.use(
    rest.post<{ uid: string; title: string }>(
      `http://${tenant.name}.localhost/grafana/api/folders`,
      (req, res, ctx) => {
        return res(
          ctx.json({
            id: folderId,
            uid: req.body.uid,
            title: `Integration: ${req.body.title}`,
            url: `/grafana/dashboards/f/${req.body.uid}/integration-${req.body.title}`,
            hasAcl: false,
            canSave: true,
            canEdit: true,
            canAdmin: false,
            createdBy: "ci-test@opstrace.com",
            created: "2021-07-29T13:10:48Z",
            updatedBy: "ci-test@opstrace.com",
            updated: "2021-07-29T13:10:48Z",
            version: 1
          })
        );
      }
    )
  );
};

const mockCreateDashboardEndpoint = (tenant: Tenant) => {
  // create dashboard
  mockServer.use(
    rest.post<{
      folderId: number;
      overwrite: boolean;
      uid: string;
    }>(
      `http://${tenant.name}.localhost/grafana/api/dashboards/db`,
      (req, res, ctx) => {
        const id = `dashboardId-${uniqueId()}`;
        const uid = `dashboardUid-${uniqueId()}`;
        return res(
          ctx.json({
            id,
            slug: "kubernetes-logs-summary",
            status: "success",
            uid,
            url: `/grafana/d/${uid}/kubernetes-logs-summary`,
            version: 1
          })
        );
      }
    )
  );
};

beforeAll(() => mockServer.listen());

beforeEach(() => {
  nock.cleanAll();
  mockServer.resetHandlers();
});

afterEach(() => {
  jest.clearAllMocks();
});

afterAll(() => mockServer.close());

const getMockIntegration = (tenant: Tenant): Integration => ({
  id: `integrationId-${uniqueId()}`,
  tenant_id: tenant.id,
  name: "mock-integration",
  key: "some-key",
  kind: "some-kind",
  data: {},
  created_at: "today",
  updated_at: "tomorrow"
});

const getMockTenant = (): Tenant => ({
  id: `tenantId-${uniqueId()}`,
  name: "mock-tenant",
  key: "some-key",
  type: "some-type",
  created_at: "today",
  updated_at: "tomorrow"
});

describe("Install Dashboards", () => {
  test("handles click", async () => {
    const updateGrafanaStateForIntegration = jest.spyOn(
      integrationActions,
      "updateGrafanaStateForIntegration"
    );
    const tenant = getMockTenant();
    const integration = getMockIntegration(tenant);
    const folderId = `folderId-${uniqueId()}`;

    mockCreateGrafanaFolderEndpoint(tenant, folderId);
    mockCreateDashboardEndpoint(tenant);

    const container = renderComponent(
      <InstallInstructions
        integration={integration}
        tenant={tenant}
        isDashboardInstalled={false}
        config="some-config"
      />
    );

    userEvent.click(
      container.getByRole("button", { name: "Install Dashboards" })
    );
    await waitFor(() =>
      expect(updateGrafanaStateForIntegration).toHaveBeenCalled()
    );

    expect(updateGrafanaStateForIntegration).toHaveBeenCalledWith({
      id: integration.id,
      grafana: {
        folder: {
          id: folderId,
          path: `/grafana/dashboards/f/i9n-${integration.id}/integration-Integration: ${integration.name}`
        }
      }
    });
  });

  test("handles grafana folder creation error", async () => {
    const tenant = getMockTenant();
    const integration = getMockIntegration(tenant);
    const errorMessage = "some error happened!";

    mockServer.use(
      rest.post<{ uid: string; title: string }>(
        `http://${tenant.name}.localhost/grafana/api/folders`,
        (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ message: errorMessage }));
        }
      )
    );

    const container = renderComponent(
      <InstallInstructions
        integration={integration}
        tenant={tenant}
        isDashboardInstalled={false}
        config="some-config"
      />
    );

    userEvent.click(
      container.getByRole("button", { name: "Install Dashboards" })
    );

    expect(
      await container.findByText(
        `Could not create grafana integration dashboard folder ${integration.name}`
      )
    ).toBeInTheDocument();
    expect(await container.findByText(errorMessage)).toBeInTheDocument();
  });

  test("handles grafana dashboard creation error", async () => {
    const tenant = getMockTenant();
    const integration = getMockIntegration(tenant);
    const error = [{"fieldNames":["Dashboard"],"classification":"RequiredError","message":"Required"}];


    mockCreateGrafanaFolderEndpoint(tenant, "some-folder-id");
    mockServer.use(
      rest.post<{
        folderId: number;
        overwrite: boolean;
        uid: string;
      }>(
        `http://${tenant.name}.localhost/grafana/api/dashboards/db`,
        (req, res, ctx) => {
          return res(ctx.status(500), ctx.json(error));
        }
      )
    );

    const container = renderComponent(
      <InstallInstructions
        integration={integration}
        tenant={tenant}
        isDashboardInstalled={false}
        config="some-config"
      />
    );

    userEvent.click(
      container.getByRole("button", { name: "Install Dashboards" })
    );
    console.log(`cf-${integration.id}`)
    expect(
      await container.findByText(
        `Could not create grafana integration dashboard cf-${integration.id}`
      )
    ).toBeInTheDocument();
    expect(await container.findByText(JSON.stringify(error[0]))).toBeInTheDocument();
  });
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
