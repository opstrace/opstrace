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
import { Switch, Route, Redirect } from "react-router";

import WithAuthentication from "client/components/withAuthentication";
import { EARLY_PREVIEW } from "client/flags";

// I think this imports the default export from ./login which is actually
// the `LoginPage` object with the <Auth0Provider>...
import LoginView from "./login";
import SelectedModule from "./module/SelectedModule";
import Modules from "./module/Modules";
import ChatView from "./chat";
import HistoryView from "./history";
import UserDetail from "./cluster/UserDetail";
import TenantDetail from "./cluster/TenantDetail";
import AlertmanagerConfigEditor from "./cluster/AlertmanagerConfigEditor";
import HelpDialog from "./help";
import NotFound from "./404/404";
import FullPage from "client/layout/FullPage";
import { ActivityBar } from "./common/ActivityBar";

export const scopedModulePathParams = ":branch/@:scope/:name@:version/:path*";
export const modulePathParams = ":branch/:name@:version/:path*";

// Not used yet
export const ChatRoutes = () => [
  <Route
    key={`/chat/${scopedModulePathParams}`}
    path={`/chat/${scopedModulePathParams}`}
    component={ChatView}
  />,
  <Route
    key={`/chat/${modulePathParams}`}
    path={`/chat/${modulePathParams}`}
    component={ChatView}
  />
];
// Not used yet
export const HistoryRoutes = () => [
  <Route
    key={`/history/${scopedModulePathParams}`}
    path={`/history/${scopedModulePathParams}`}
    component={HistoryView}
  />,
  <Route
    key={`/history/${modulePathParams}`}
    path={`/history/${modulePathParams}`}
    component={HistoryView}
  />
];

const AuthenticatedRoutes = () => {
  return (
    <FullPage>
      {/* If you change route config, make sure to also check the tabs in ActivityBar to ensure they are configured with the updated routing.
          At some point we can refactor the ActivityBar so that we pass tabs in from here, to make all route configuration central and within this file. */}
      <ActivityBar />
      <Switch>
        {/* Module routes */}
        {EARLY_PREVIEW && (
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
        )}

        <Redirect
          exact
          key="/cluster"
          from="/cluster"
          to="/cluster/tenants/system"
        />
        <Route
          key="/cluster/users/:id"
          path="/cluster/users/:id"
          component={UserDetail}
        />
        <Route
          key="/cluster/tenants/:tenantId/alert-manager-config"
          path="/cluster/tenants/:tenantId/alert-manager-config"
          component={AlertmanagerConfigEditor}
        />
        <Route
          key="/cluster/tenants/:tenant"
          path="/cluster/tenants/:tenant"
          component={TenantDetail}
        />
        <Route key="*" path="*" component={NotFound} />
      </Switch>
      <HelpDialog />
    </FullPage>
  );
};

const Routes = () => {
  return (
    <Switch>
      {EARLY_PREVIEW ? (
        <Redirect exact key="/" from="/" to="/module/main" />
      ) : (
        <Redirect exact key="/" from="/" to="/cluster" />
      )}
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
            <AuthenticatedRoutes />
          </WithAuthentication>
        )}
      />
    </Switch>
  );
};

export default React.memo(Routes);
