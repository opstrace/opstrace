/**
 * Copyright 2020 Opstrace, Inc.
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

import { makeStyles } from "@material-ui/core/styles";
import { Switch, Route, Redirect, useRouteMatch } from "react-router";

import {
  Zap,
  Grid,
  BarChart2,
  Bell,
  Users,
  Layers,
  Activity
} from "react-feather";

import WithAuthentication from "client/components/withAuthentication";
import ErrorBoundary from "client/components/Error/Boundary";
import { Box } from "client/components/Box";

import Theme from "client/themes";
import Services from "client/services";
import { StoreProvider } from "state/provider";
import SideBar, {
  minimizedSidebarWidth,
  sidebarWidth
} from "client/views/common/SideBar";
import AppBar, { appBarHeight } from "client/views/common/AppBar";
import { useSelectedTenant } from "state/tenant/hooks/useTenant";

import GettingStarted from "client/views/getting-started";
import TenantOverview from "client/views/overview";
import {
  TenantIntegrations,
  AddIntegration,
  ShowIntegration,
  EditIntegration
} from "client/viewsBasic/tenantIntegrations";
import TenantAlerting from "client/views/alerting";
import LoginView from "client/views/login";
import HelpDialog from "client/views/help";
import NotFound from "client/views/404/404";
import ClusterOverview from "./views/cluster-overview";
import UsersTable from "client/views/users/list";
import TenantsTable from "client/views/tenants/list";

import UserDetail from "client/views/users/detail";
// import TenantDetail from "client/views/tenant/TenantDetail";
// import AlertmanagerConfigEditor from "client/views/tenant/alertmanagerConfig/editor";
import { CloudMetrics } from "client/viewsBasic/cloudMetrics";

const useStyles = makeStyles(theme => ({
  content: {
    flexGrow: 1,
    marginTop: appBarHeight,
    marginLeft: sidebarWidth,
    [theme.breakpoints.down("md")]: {
      marginLeft: minimizedSidebarWidth
    }
  }
}));

const AuthProtectedApplication = () => {
  const classes = useStyles();
  const clusterRoutesMatch = useRouteMatch<{ tenantId: string }>("/cluster/*");
  const tenant = useSelectedTenant();

  if (tenant === null) {
    // Still loading tenants
    return null;
  }
  if (typeof tenant === "undefined" && !clusterRoutesMatch) {
    // Tenant not found, redirect to the system tenant since it's known
    return <Redirect key="invalid-tenant" from="*" to="/tenant/system" />;
  }

  const tenantName = tenant ? tenant.name : "system";

  return (
    <Box>
      <AppBar />
      <SideBar
        tenantNavItems={[
          {
            title: "Getting Started",
            icon: <Zap />,
            path: `/tenant/${tenantName}/getting-started`
          },
          {
            title: "Overview",
            icon: <BarChart2 />,
            path: `/tenant/${tenantName}/overview`
          },
          {
            title: "Alerting",
            icon: <Bell />,
            path: `/tenant/${tenantName}/alerting`,
            nestedItems: [
              {
                title: "Alerts",
                path: `/tenant/${tenantName}/alerting/alerts`
              },
              {
                title: "Configuration",
                path: `/tenant/${tenantName}/alerting/configuration`
              }
            ]
          },
          {
            title: "Users",
            icon: <Users />,
            path: `/tenant/${tenantName}/users`
          },
          {
            title: "Integrations",
            icon: <Grid />,
            path: `/tenant/${tenantName}/integrations`,
            nestedItems: [
              {
                title: "All",
                path: `/tenant/${tenantName}/integrations/all`
              },
              {
                title: "Installed",
                path: `/tenant/${tenantName}/integrations/installed`
              }
            ]
          }
        ]}
        clusterNavItems={[
          {
            title: "Health",
            icon: <Activity />,
            path: `/cluster/health`
          },
          {
            title: "Users",
            icon: <Users />,
            path: `/cluster/users`
          },
          {
            title: "Tenants",
            icon: <Layers />,
            path: `/cluster/tenants`
          }
        ]}
      />
      <Box minWidth="100%">
        <Box className={classes.content} p={3}>
          <Switch>
            <Redirect
              key="redirect-to-getting-started"
              from="/tenant/:tenantId"
              exact
              to="/tenant/:tenantId/getting-started"
            />
            ;
            <Route
              exact
              key="tenant-getting-started"
              path="/tenant/:tenantId/getting-started"
              component={GettingStarted}
            />
            <Route
              exact
              key="tenant-overview"
              path="/tenant/:tenantId/overview"
              component={TenantOverview}
            />
            <Route
              exact
              key="tenant-alerting-alerts"
              path="/tenant/:tenantId/alerting/alerts"
              component={TenantAlerting}
            />
            <Route
              exact
              key="tenant-alerting-configuration"
              path="/tenant/:tenantId/alerting/configuration"
              component={TenantAlerting}
            />
            <Route
              exact
              key="tenant-user-list"
              path="/tenant/:tenantId/users"
              component={UsersTable}
            />
            <Route
              exact
              key="tenant-user"
              path="/tenant/:tenantId/users/:userId"
              component={UserDetail}
            />
            <Route
              exact
              key="tenant-integrations-all"
              path="/tenant/:tenantId/integrations/all"
              component={TenantIntegrations}
            />
            <Route
              exact
              key="tenant-integrations-installed"
              path="/tenant/:tenantId/integrations/installed"
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
            <Route
              exact
              key="tenant-cloud-metrics"
              path="/tenant/:tenantId/cloud-metrics"
              component={CloudMetrics}
            />
            <Route
              exact
              key="cluster-health"
              path="/cluster/health"
              component={ClusterOverview}
            />
            <Route
              exact
              key="cluster-user-list"
              path="/cluster/users"
              component={UsersTable}
            />
            <Route
              exact
              key="cluster-user"
              path="/cluster/users/:userId"
              component={UserDetail}
            />
            <Route
              exact
              key="cluster-tenant-list"
              path="/cluster/tenants"
              component={TenantsTable}
            />
            <Route key="*" path="*" component={NotFound} />
          </Switch>
        </Box>

        <HelpDialog />
      </Box>
    </Box>
  );
};

const App = () => {
  return (
    <StoreProvider>
      <Theme.ThemeSwitcher>
        <ErrorBoundary>
          <Services>
            <Switch>
              <Redirect exact key="/" from="/" to="/tenant/system" />
              <Route
                exact
                key="/login"
                path="/login"
                component={() => (
                  <WithAuthentication onFailure={<LoginView />}>
                    <Redirect to="/" />
                  </WithAuthentication>
                )}
              />
              <Route
                key="*"
                path="*"
                component={() => (
                  <WithAuthentication onFailure={<Redirect to="/login" />}>
                    <AuthProtectedApplication />
                  </WithAuthentication>
                )}
              />
            </Switch>
          </Services>
        </ErrorBoundary>
      </Theme.ThemeSwitcher>
    </StoreProvider>
  );
};

export default App;

// Not currently used while module routes are TEMPORARILY disabled
// import SelectedModule from "client/views/module/SelectedModule";
// import Modules from "client/views/module/Modules";
// export const scopedModulePathParams = ":branch/@:scope/:name@:version/:path*";
// export const modulePathParams = ":branch/:name@:version/:path*";
/* {EARLY_PREVIEW && (
    <Route
      key={`/module/${scopedModulePathParams}`}
      path={`/module/${scopedModulePathParams}`}
      component={SelectedModule}
    />
  )}
  {EARLY_PREVIEW && (
    <Route
      key={`/module/${modulePathParams}`}
      path={`/module/${modulePathParams}`}
      component={SelectedModule}
    />
  )}
  {EARLY_PREVIEW && (
    <Route
      key={`/module/:branch`}
      path={`/module/:branch`}
      component={Modules}
    />
  )}
  {EARLY_PREVIEW && (
    <Redirect exact key="/module" from="/module" to="/module/main" />
  )} */
