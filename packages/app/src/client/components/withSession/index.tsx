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

import { useCommandService } from "client/services/Command";

import { setCurrentUser } from "state/user/actions";

import Loading from "client/components/Loadable/Loading";
import { Page } from "client/components/Page";
import { Box } from "client/components/Box";
import { Button } from "client/components/Button";
import { Typography } from "client/components/Typography";
import TracyImg from "client/views/common/Tracy";

const auth0Audience = "https://user-cluster.opstrace.io/api";
const clusterName = window.location.host.endsWith("opstrace.io")
  ? window.location.host.replace(".opstrace.io", "")
  : "localhost";

type AppState = {
  returnTo?: string;
};

// TODO: "WithSession" re-mounts after user logs into Auth0 and creates a new session causing a subsequent status check

export const WithSession = ({ children }: { children: React.ReactNode }) => {
  const [{ data, loading, error: _statusError }] = useAxios({
    url: "/_/auth/status",
    method: "GET",
    withCredentials: true
  });
  // remember the landing page before switching to /login for users without sessions
  const [returnTo] = useState(window.location.pathname);

  const userAppState = useRef<AppState>();
  const dispatch = useDispatch();

  const handleUserLoaded = useCallback(
    (userId: string, newSession: boolean = false) => {
      dispatch(setCurrentUser(userId));
      if (newSession) {
        const pathname =
          userAppState.current?.returnTo || "/tenant/system/getting-started";
        window.location.href = `${
          window.location.href.split(window.location.pathname)[0]
        }${pathname}`;
      }
    },
    [dispatch]
  );

  useEffect(() => {
    if (data?.currentUserId) {
      handleUserLoaded(data.currentUserId);
    }
  }, [handleUserLoaded, data?.currentUserId]);

  const updateAppState = (appState?: AppState) => {
    userAppState.current = appState;
  };

  if (loading) {
    // || newSession) {
    return <Loading />;
  } else if (data?.currentUserId) {
    return <>{children}</>;
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
              audience={auth0Audience}
              redirectUri={`${
                window.location.href.split(window.location.pathname)[0]
              }/login`}
              onRedirectCallback={updateAppState}
            >
              <VerifyUser
                userLoadedCallback={handleUserLoaded}
                returnTo={returnTo}
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
  userLoadedCallback,
  returnTo
}: {
  userLoadedCallback: Function;
  returnTo: string;
}) => {
  const { isLoading, isAuthenticated, loginWithRedirect } = useAuth0();

  const loginHandler = useCallback(() => {
    loginWithRedirect({
      appState: {
        returnTo
      }
    });
  }, [loginWithRedirect, returnTo]);

  if (isLoading) return <Loading />;
  else if (isAuthenticated)
    return <CreateSession userLoadedCallback={userLoadedCallback} />;
  else return <LoginPage loginHandler={loginHandler} />;
};

const CreateSession = ({
  userLoadedCallback
}: {
  userLoadedCallback: Function;
}) => {
  const { user, getAccessTokenSilently } = useAuth0();
  const dispatch = useDispatch();

  useEffect(() => {
    (async () => {
      try {
        const accessToken = await getAccessTokenSilently({
          audience: auth0Audience,
          opstraceClusterName: clusterName
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

        // todo: inspect response to see if successful, maybe email is not in the users table

        if (response.data?.currentUserId)
          userLoadedCallback(response.data.currentUserId, true);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [getAccessTokenSilently, dispatch, userLoadedCallback]);

  return <Loading />;
};

const LoginPage = ({ loginHandler }: { loginHandler: () => void }) => {
  useCommandService(
    {
      id: "login-on-enter",
      description: "Login",
      keybindings: ["enter"],
      handler: loginHandler
    },
    []
  );

  return (
    <Page centered height="100vh" width="100vw">
      <Box>
        <Box p={1} mb={4} display="flex" width="100%" justifyContent="center">
          <Box p={1} height={150} width={100}>
            <TracyImg />
          </Box>
          <Box p={1} height={150} display="flex" alignItems="center">
            <Typography variant="h3">opstrace</Typography>
          </Box>
        </Box>
        <Box p={1} display="flex" width="100%" justifyContent="center">
          <Box display="flex" alignItems="center" p={1}>
            <Button
              variant="contained"
              state="primary"
              size="large"
              onClick={loginHandler}
            >
              Log In
            </Button>
          </Box>
          <Box display="flex" alignItems="center" p={1}>
            <Typography color="textSecondary"> Hit ENTER to log in.</Typography>
          </Box>
        </Box>
      </Box>
    </Page>
  );
};
