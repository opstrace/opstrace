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
import { Switch, Route, Redirect } from "react-router";

import WithAuthentication from "client/components/withAuthentication";
import { EARLY_ACCESS } from "client/flags";

import LoginView from "./login";
import ModuleView from "./module";
import ChatView from "./chat";
import HistoryView from "./history";
import ClusterView from "./cluster";
import NotFound from "./404/404";

const scopedModulePathParams =
  ":mode(-|e)/:branch/@:scope/:name/:version/:path*";
const modulePathParams = ":mode(-|e)/:branch/:name/:version/:path*";

const ModuleRoutes = () => (
  <>
    <Route
      key={`/module/${scopedModulePathParams}`}
      path={`/module/${scopedModulePathParams}`}
      component={ModuleView}
    />
    <Route
      key={`/module/${modulePathParams}`}
      path={`/module/${modulePathParams}`}
      component={ModuleView}
    />
  </>
);

const ChatRoutes = () => (
  <>
    <Route
      key={`/chat/${scopedModulePathParams}`}
      path={`/chat/${scopedModulePathParams}`}
      component={ChatView}
    />
    <Route
      key={`/chat/${modulePathParams}`}
      path={`/chat/${modulePathParams}`}
      component={ChatView}
    />
  </>
);

const HistoryRoutes = () => (
  <>
    <Route
      key={`/history/${scopedModulePathParams}`}
      path={`/history/${scopedModulePathParams}`}
      component={HistoryView}
    />
    <Route
      key={`/history/${modulePathParams}`}
      path={`/history/${modulePathParams}`}
      component={HistoryView}
    />
  </>
);

const AuthenticatedRoutes = () => {
  return (
    <Switch>
      {EARLY_ACCESS && ModuleRoutes}
      {EARLY_ACCESS && ChatRoutes}
      {EARLY_ACCESS && HistoryRoutes}
      <Route key="/cluster" path="/cluster" component={ClusterView} />
    </Switch>
  );
};

const Routes = () => {
  return (
    <Switch>
      <Redirect exact key="/" from="/" to="/cluster" />
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
        key="/:tab"
        path="/:tab"
        component={() => (
          <WithAuthentication onFailure={<Redirect to="/login" />}>
            <AuthenticatedRoutes />
          </WithAuthentication>
        )}
      />
      <Route key="*" path="*" component={NotFound} />
    </Switch>
  );
};

export default Routes;
