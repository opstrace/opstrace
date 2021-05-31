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

import { AllIntegrations } from "./all/All";
import { InstalledIntegrations } from "./installed/Installed";

import { Box } from "client/components/Box";
import Typography from "client/components/Typography/Typography";
import { Tabs } from "client/components/Tabs";
import { useSelectedTenantWithFallback } from "state/tenant/hooks/useTenant";
import { useIntegrationList } from "state/integration/hooks/useIntegrationList";

export { AddIntegration } from "./all/Add";
export { ShowIntegration } from "./all/Show";
export { EditIntegration } from "./installed/Edit";

export const TenantIntegrations = () => {
  const tenant = useSelectedTenantWithFallback();
  const integrations = useIntegrationList();

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
            title: `Installed Integrations (${integrations.length})`,
            component: InstalledIntegrations
          }
        ]}
      />
    </>
  );
};
