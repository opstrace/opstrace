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

import SideBar from "client/views/module/sidebar/index";
import Layout from "client/views/module/layout/MainContent";

import TenantDetail from "client/views/tenant/TenantDetail";
import AlertmanagerConfigEditor from "client/views/tenant/alertmanagerConfig/editor";
import { CloudMetrics } from "client/viewsBasic/cloudMetrics";
import { TenantIntegrations } from "client/viewsBasic/tenantIntegrations";

import NotFound from "client/views/404/404";

const TenantRouter = () => {
  return (
    <Layout sidebar={SideBar}>
      <Switch>
        <Route
          exact
          key="/cluster/tenants/:tenantId/alertmanager"
          path="/cluster/tenants/:tenantId/alertmanager"
          component={AlertmanagerConfigEditor}
        />
        <Route
          exact
          key="/cluster/tenants/:tenantId/cloud-metrics"
          path="/cluster/tenants/:tenantId/cloud-metrics"
          component={CloudMetrics}
        />
        {EARLY_PREVIEW && (
          <Route
            exact
            key="/cluster/tenants/:tenantId/integrations"
            path="/cluster/tenants/:tenantId/integrations"
            component={TenantIntegrations}
          />
        )}
        <Route
          exact
          key="/cluster/tenants/:tenantId"
          path="/cluster/tenants/:tenantId"
          component={TenantDetail}
        />
        <Route key="*" path="*" component={NotFound} />
      </Switch>
    </Layout>
  );
};

export default TenantRouter;
