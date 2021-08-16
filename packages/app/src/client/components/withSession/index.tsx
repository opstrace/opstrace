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

/**
 *
 * == Background ==
 *
 * Opstrace authentication and session management are both handled independently from
 * each other.
 *
 * We only use Auth0 as a way of proving who the user is and that they control the
 * email address used. Once this is done we check their email address against the list
 * of authorised Opstrace users - if present we create a session for them which grants
 * them access to the app. From then on we rely solely on the opstrace session and have
 * no further use of Auth0. Continued access to the website is granted based on the
 * Opstrace session not the Auth0 session.
 *
 * == WithSession ==
 *
 * WithSession is a gatekeeper component and will only render props.children for users
 * with a valid Opstrace session. If they don't have one then WithSession will guide
 * users to authenticate with Auth0, checking they are authorised and then creating a
 * valid session for them.
 *
 * There are 3 flows / processes that WithSession caters for:
 *
 * 1. User already logged in, has a valid session
 *
 * WithSession has been optimised for this case - it attempts to as quickly as possible
 * determine if the user is logged in or not. It does not wait for Redux data, websocket
 * connections etc... to be setup. Upon mounting it immediately makes a direct call to
 * "/_/auth/status" to find out the the user's session status.
 *
 * 2. User does not have a valid Auth0 or Opstrace session
 *
 * WithSession redirects the user to be authenticated with Auth0 first, when they are
 * redirected back a valid Opstrace session is generated for them provided they pass the
 * authorisation check.
 *
 * 3. User logged into Auth0, but no valid Opstrace session
 *
 * In this case WithSession silently creates a valid Opstrace session for the user if
 * they are authorised to access the website.
 *
 * Note: users do not "signup" to Opstrace.
 *
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import { Switch, Route, Redirect } from "react-router";
import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import axios, { AxiosResponse } from "axios";
import useAxios from "axios-hooks";

import { setCurrentUser } from "state/user/actions";

import { OpstraceBuildInfo } from "state/opstrace-config/types";
import { updateOpstraceBuildInfo } from "state/opstrace-config/actions";

import { loginUrl, makeUrl } from "./paths";

import {
  LoadingPage,
  LoginPage,
  LogoutPage,
  AccessDeniedPage,
  LoginFailedPage
} from "client/views/session";

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

type StatusData = {
  currentUserId?: string;
  auth0Config: { domain: string; clientId: string };
  buildInfo: OpstraceBuildInfo;
};

export const WithSession = ({ children }: { children: React.ReactNode }) => {
  // TODO: need to double check that the UseAxios response doesn't expire and this status check isn't re-run after a while.
  // The reason for this is that "loadingStatus" would flip back to true and block the user for accessing the site while the
  // check is occuring. We only want to interrupt the user if their session with Auth0 actually expires - if the session
  // we create expires first it should silently be re-created without the user noticing
  let [{ data, loading: loadingStatus, error: statusError }] = useAxios({
    url: "/_/auth/status",
    method: "GET",
    withCredentials: true
  });
  // terrcin: ugh, don't know how to cast this in the above useAxios with typescript
  data = data as StatusData;

  const appStateRef = useRef<AppState>({ returnTo: window.location.pathname });
  const dispatch = useDispatch();

  const handleUserLoadedSuccess = useCallback(
    (userId: string, newSession: boolean = false) => {
      dispatch(setCurrentUser(userId));
      if (newSession) {
        let returnTo = appStateRef.current?.returnTo || DEFAULT_PATHNAME;
        if (returnTo === "/login") {
          // This covers the case of the user clicking "logout", being redirected to the login page, and then immediately
          // logging in again. The system will see them coming from "/login" so will think that's where they should be
          // redirected back there. This saves them a hop.
          returnTo = DEFAULT_PATHNAME;
        }

        // Can't use "history.push(returnTo)" here as it doesn't update the url, have not looked into "why" we can't
        window.location.href = makeUrl(returnTo);
      }
    },
    [dispatch]
  );

  useEffect(() => {
    if (data?.currentUserId) {
      handleUserLoadedSuccess(data.currentUserId);
    }
  }, [handleUserLoadedSuccess, data?.currentUserId]);

  useEffect(() => {
    if (data?.buildInfo) {
      dispatch(updateOpstraceBuildInfo({ buildInfo: data.buildInfo }));
    }
  }, [data?.buildInfo, dispatch]);

  const reloadAppState = (appState: AppState = {}) => {
    appStateRef.current = appState;
  };

  if (statusError) console.log("WithSession#statusError:", statusError);

  if (loadingStatus) {
    return <LoadingPage stage="status-check" />;
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
              redirectUri={loginUrl()}
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
              redirectUri={loginUrl()}
              onRedirectCallback={reloadAppState}
            >
              <DetectUser
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

const DetectUser = ({
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

  if (isLoading) return <LoadingPage stage="auth0" />;
  else if (isAuthenticated)
    return <CreateSession userLoadedSuccess={userLoadedSuccess} />;
  else return <LoginPage onLogin={loginHandler} />;
};

const CreateSession = ({
  userLoadedSuccess
}: {
  userLoadedSuccess: Function;
}) => {
  const { getAccessTokenSilently } = useAuth0();
  const [loginErrorString, setLoginErrorString] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      let at: string;
      try {
        // Note(JP): `getAccessTokenSilently()` must have its own local error
        // handler. It involves a number of HTTP requests behind the scenes.
        // When this fails the login sequence failed and we should show a
        // "login failed" error, exposing the detail, offering a button "Try
        // again"
        at = await getAccessTokenSilently({
          audience: AUTH0_AUDIENCE,
          opstraceClusterName: CLUSTER_NAME
        });
      } catch (err) {
        setLoginErrorString(`could not get access token: ${err.message}`);
        return;
      }

      // Note(JP): this request exchanges the Auth0 access token into a session
      // secret. The request must have its own local error handler. Show an
      // "access denied" error (only!) when a 403 response comes in.
      let resp: AxiosResponse<any>;
      try {
        resp = await loginRequestWithRetry(at);
      } catch (err) {
        if (!axios.isAxiosError(err)) {
          // re-throw programming errors
          throw err;
        }

        if (err.response) {
          // non-2xx responses
          const r = err.response;
          if (r.status === 403) {
            // Display the rather specific 'access denied' error page only when
            // we get the unambiguous signal; which is a 403 response. note:
            // the response body may contain a reason -- log this?
            setAccessDenied(true);
            return;
          }

          // TODO: expose parts of the response body if structured err info is
          // present, in expected format.
          setLoginErrorString(
            `POST to /_/auth/session got an unexpected response with status ${r.status}`
          );
          return;
        }

        // timeout errors, transient errors etc
        // maybe even body deserialization errors when resp headers and body
        // mismatch
        setLoginErrorString(`POST to /_/auth/session failed: ${err.message}`);
        return;
      }

      // When we are here, `resp` should not be `undefined` (rely on axios
      // error handling to ensure that. Filter for expected response body
      // structure Axios does the JSON deserialization for us.
      if (resp.data && resp.data.currentUserId) {
        userLoadedSuccess(resp.data.currentUserId, true);
        return;
      }

      // The response body did not have the expected structure.
      setLoginErrorString(
        `POST to /_/auth/session got 2xx response with unexpected body: ${JSON.stringify(
          resp.data,
          null,
          2
        ).slice(0, 500)}`
      );
    })();
  }, [
    getAccessTokenSilently,
    userLoadedSuccess,
    setLoginErrorString,
    setAccessDenied
  ]);

  if (loginErrorString) {
    return <LoginFailedPage errorString={loginErrorString} />;
  }

  if (accessDenied) {
    return <AccessDeniedPage />;
  }

  return <LoadingPage stage="create-session" />;
};

async function loginRequestWithRetry(
  auth0AccessToken: string
): Promise<AxiosResponse<any>> {
  // Use a custom retrying config. Do that by creating a local Axios instance
  // and  then attach the rax logic to it. The outcome is that axios is _not_
  // affected globally.
  //
  // `timeout`: in Axios, `timeout` controls the entire HTTP request (no more
  // fine-grained control available). Expect the HTTP request handler in web
  // app to be reasonably fast; it may however need a tiny bit of time for JWKS
  // (re)fetching. After ~10 seconds we can and should retry.
  //
  //`retry`: retry count for requests that return a response.
  // `noResponseRetries` is for scenarios where request not sent, response not
  // received.
  //
  // Use default for `statusCodesToRetry`: 100-199, 429, 500-599
  // Retry for POST, which is the only method used here.
  //
  // Set constant delay between attempts. `retryDelay` (in ms) applies only for
  // the `static` strategy. Wait about one second between attempts. Goal is to
  // quickly heal short network hiccups / reconnects, but not try forever. log
  // detail about those scenarios that leads to retrying.
  const httpclient = axios.create({
    timeout: 10000
  });
  httpclient.defaults.raxConfig = {
    instance: httpclient,
    retry: 3,
    noResponseRetries: 3,
    backoffType: "static",
    retryDelay: 1000,
    httpMethodsToRetry: ["POST"],
    onRetryAttempt: err => {
      const cfg = rax.getConfig(err);
      console.log(
        `POST to /_/auth/session: retry attempt #${
          cfg!.currentRetryAttempt
        } after: ${err.message}`
      );
    }
  };
  rax.attach(httpclient);

  const resp: AxiosResponse<any> = await httpclient.request({
    method: "POST",
    url: "/_/auth/session",
    headers: {
      Authorization: `Bearer ${auth0AccessToken}`
    }
  });

  return resp;
}
