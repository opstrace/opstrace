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

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import { Switch, Route, Redirect } from "react-router";
import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import axios from "axios";
import useAxios from "axios-hooks";

import { setCurrentUser } from "state/user/actions";
import { GeneralServerError } from "server/errors";

import { LoadingPage, LoginPage, LogoutPage, AccessDeniedPage } from "./pages";

const DEFAULT_PATHNAME = "/";
const AUTH0_AUDIENCE = "https://user-cluster.opstrace.io/api";
const CLUSTER_NAME = window.location.host.endsWith("opstrace.io")
  ? window.location.host.replace(".opstrace.io", "")
  : "localhost";

type AppState = {
  returnTo?: string;
};

// TODO: "WithSession" re-mounts after user logs into Auth0 and creates a new session causing a subsequent status check
// TODO: look to switching to using a "context" for passing things to children components

export const WithSession = ({ children }: { children: React.ReactNode }) => {
  const [{ data, loading: loadingStatus, error: statusError }] = useAxios({
    url: "/_/auth/status",
    method: "GET",
    withCredentials: true
  });
  const appStateRef = useRef<AppState>({ returnTo: window.location.pathname });
  const dispatch = useDispatch();

  const handleUserLoadedSuccess = useCallback(
    (userId: string, newSession: boolean = false) => {
      dispatch(setCurrentUser(userId));
      if (newSession) {
        let returnTo = appStateRef.current?.returnTo || DEFAULT_PATHNAME;
        if (returnTo === "/login") {
          // This covers the case of the user clicking "logout", being redirected to the login page, and then immediately
          // logging in again. The sysem will see them coming from "/login" so will think that's where they should be
          // redirected back there. This saves them a hop.
          returnTo = DEFAULT_PATHNAME;
        }
        window.location.href = `${
          window.location.href.split(window.location.pathname)[0]
        }${returnTo}`;
      }
    },
    [dispatch]
  );

  useEffect(() => {
    if (data?.currentUserId) {
      handleUserLoadedSuccess(data.currentUserId);
    }
  }, [handleUserLoadedSuccess, data?.currentUserId]);

  const reloadAppState = (appState: AppState = {}) => {
    appStateRef.current = appState;
  };

  if (statusError) console.log("WithSession#statusError:", statusError);

  if (loadingStatus) {
    return <LoadingPage />;
  } else if (data?.currentUserId) {
    return (
      <Switch>
        <Route
          exact
          key="/logout"
          path="/logout"
          component={() => (
            <Auth0Provider
              domain={data.auth0Config.domain}
              clientId={data.auth0Config.clientId}
              audience={AUTH0_AUDIENCE}
              redirectUri={`${
                window.location.href.split(window.location.pathname)[0]
              }/login`}
            >
              <LogoutPage />
            </Auth0Provider>
          )}
        />
        <Redirect key="/login" from="/login" to={DEFAULT_PATHNAME} />
        <Route key="app" path="*" component={() => <>{children}</>} />
      </Switch>
    );
  } else {
    return (
      <Switch>
        <Route
          key="/login"
          path="/login"
          component={() => (
            <Auth0Provider
              domain={data.auth0Config.domain}
              clientId={data.auth0Config.clientId}
              audience={AUTH0_AUDIENCE}
              redirectUri={`${
                window.location.href.split(window.location.pathname)[0]
              }/login`}
              onRedirectCallback={reloadAppState}
            >
              <VerifyUser
                userLoadedSuccess={handleUserLoadedSuccess}
                appState={appStateRef.current}
              />
            </Auth0Provider>
          )}
        />
        <Redirect from="*" to="/login" />
      </Switch>
    );
  }
};

const VerifyUser = ({
  userLoadedSuccess,
  appState
}: {
  userLoadedSuccess: Function;
  appState: AppState;
}) => {
  const { isLoading, isAuthenticated, loginWithRedirect } = useAuth0();

  const loginHandler = useCallback(() => {
    loginWithRedirect({
      appState
    });
  }, [loginWithRedirect, appState]);

  if (isLoading) return <LoadingPage />;
  else if (isAuthenticated)
    return <CreateSession userLoadedSuccess={userLoadedSuccess} />;
  else return <LoginPage onLogin={loginHandler} />;
};

const CreateSession = ({
  userLoadedSuccess
}: {
  userLoadedSuccess: Function;
}) => {
  const { user, getAccessTokenSilently } = useAuth0();
  const [accessDenied, setAccessDenied] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    (async () => {
      try {
        const accessToken = await getAccessTokenSilently({
          audience: AUTH0_AUDIENCE,
          opstraceClusterName: CLUSTER_NAME
        });

        const response = await axios.request({
          method: "POST",
          url: "/_/auth/session",
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
          data: {
            email: user.email,
            avatar: user.picture || "",
            username: (
              user.nickname ||
              user.username ||
              user.given_name ||
              user.name ||
              ""
            ).toLowerCase()
          }
        });

        if (response.data?.currentUserId)
          userLoadedSuccess(response.data.currentUserId, true);
      } catch (e) {
        if (GeneralServerError.isInstance(e.response.data)) {
          setAccessDenied(true);
        } else {
          console.error(e);
        }
      }
    })();
  }, [
    user,
    getAccessTokenSilently,
    dispatch,
    userLoadedSuccess,
    setAccessDenied
  ]);

  if (accessDenied) return <AccessDeniedPage />;
  else return <LoadingPage />;
};
