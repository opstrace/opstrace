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

import { AllIntegrations } from "./tabs/All";
import { InstalledIntegrations } from "./tabs/Installed";

import { withTenantFromParams, TenantProps } from "client/views/tenant/utils";
import {
  withIntegrationListFromParams,
  IntegrationListProps
} from "client/viewsBasic/tenantIntegrations/utils";

import { Box } from "client/components/Box";
import Typography from "client/components/Typography/Typography";
import { Tabs } from "client/components/Tabs";

export { AddIntegration } from "./Add";
export { ShowIntegration } from "./Show";
export { EditIntegration } from "./Edit";

export const TenantIntegrations = withTenantFromParams(
  withIntegrationListFromParams(
    ({ tenant, integrationList }: TenantProps & IntegrationListProps) => {
      return (
        <>
          <Box pt={1} pb={4}>
            <Typography variant="h1">Integrations</Typography>
          </Box>
          <Tabs
            tabs={[
              {
                path: `/tenant/:tenantId/integrations/all`,
                to: `/tenant/${tenant.name}/integrations/all`,
                title: "All Integrations",
                component: AllIntegrations
              },
              {
                path: `/tenant/:tenantId/integrations/installed`,
                to: `/tenant/${tenant.name}/integrations/installed`,
                title: `Installed Integrations (${integrationList.length})`,
                component: InstalledIntegrations
              }
            ]}
          />
        </>
      );
    }
  )
);
