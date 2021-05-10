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
import { Switch, Route } from "react-router";

import { EARLY_PREVIEW } from "client/flags";

import {
  TenantIntegrations,
  AddIntegration,
  ShowIntegration,
  EditIntegration
} from "client/viewsBasic/tenantIntegrations";

export const IntegrationRoutes = () => {
  if (!EARLY_PREVIEW) return null;

  return (
    <Switch>
      <Route
        exact
        key="/cluster/tenants/:tenantId/integrations"
        path="/cluster/tenants/:tenantId/integrations"
        component={TenantIntegrations}
      />
      <Route
        exact
        key="/cluster/tenants/:tenantId/integrations/add/:integrationKind"
        path="/cluster/tenants/:tenantId/integrations/add/:integrationKind"
        component={AddIntegration}
      />
      <Route
        exact
        key="/cluster/tenants/:tenantId/integrations/:integrationId"
        path="/cluster/tenants/:tenantId/integrations/:integrationId"
        component={ShowIntegration}
      />
      <Route
        exact
        key="/cluster/tenants/:tenantId/integrations/:integrationId/edit"
        path="/cluster/tenants/:tenantId/integrations/:integrationId/edit"
        component={EditIntegration}
      />
    </Switch>
  );
};
