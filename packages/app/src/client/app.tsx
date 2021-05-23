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
  Activity,
  Compass,
  Layout
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
} from "client/views/integrations";
import TenantAlerting from "client/views/alerting";
import LoginView from "client/views/login";
import HelpDialog from "client/views/help";
import NotFound from "client/views/404/404";
import ClusterOverview from "./views/cluster-overview";
import UsersTable from "client/views/users/list";
import TenantsTable from "client/views/tenants/list";
import TenantDashboards from "client/views/dashboards";
import UserDetail from "client/views/users/detail";
import TenantExplore from "client/views/explore";

const useStyles = makeStyles(theme => ({
  content: {
    flexGrow: 1,
    marginTop: appBarHeight,
    marginLeft: sidebarWidth,
    [theme.breakpoints.down("md")]: {
      marginLeft: minimizedSidebarWidth
    },
    minHeight: `calc(100vh - ${appBarHeight}px)`,
    position: "relative"
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
            title: "Dashboards",
            icon: <Layout />,
            path: `/tenant/${tenantName}/dashboards`
          },
          {
            title: "Explore",
            icon: <Compass />,
            path: `/tenant/${tenantName}/explore`
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
              key="tenant-dashboards"
              path="/tenant/:tenantId/dashboards"
              component={TenantDashboards}
            />
            <Route
              exact
              key="tenant-explore"
              path="/tenant/:tenantId/explore"
              component={TenantExplore}
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
              key="/tenant/:tenantId/integrations/all/add/:integrationKind"
              path="/tenant/:tenantId/integrations/all/add/:integrationKind"
              component={AddIntegration}
            />
            <Route
              exact
              key="/tenant/:tenantId/integrations/installed/:integrationId"
              path="/tenant/:tenantId/integrations/installed/:integrationId"
              component={ShowIntegration}
            />
            <Route
              exact
              key="/tenant/:tenantId/integrations/installed/:integrationId/edit"
              path="/tenant/:tenantId/integrations/installed/:integrationId/edit"
              component={EditIntegration}
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
