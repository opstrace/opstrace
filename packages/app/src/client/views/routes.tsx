import React from "react";
import { Switch, Route, Redirect } from "react-router";

import WithAuthentication from "client/components/withAuthentication";
import { EARLY_PREVIEW } from "client/flags";

import LoginView from "./login";
import ModuleView from "./module";
import ChatView from "./chat";
import HistoryView from "./history";
import ClusterView from "./cluster";
import NotFound from "./404/404";
import FullPage from "client/layout/FullPage";
import { ActivityBar } from "./common/ActivityBar";

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
    <FullPage>
      {/* If you change route config, make sure to also check the tabs in ActivityBar to ensure they are configured with the updated routing.
          At some point we can refactor the ActivityBar so that we pass tabs in from here, to make all route configuration central and within this file. */}
      <ActivityBar />
      <Switch>
        {EARLY_PREVIEW && ModuleRoutes}
        {EARLY_PREVIEW && ChatRoutes}
        {EARLY_PREVIEW && HistoryRoutes}
        <Route key="/cluster" path="/cluster" component={ClusterView} />
        <Route key="*" path="*" component={NotFound} />
      </Switch>
    </FullPage>
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

export default Routes;
