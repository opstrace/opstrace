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
  const [returnTo] = useState(window.location.pathname);
  const [newSession, setNewSession] = useState(false);
  const userAppState = useRef<AppState>();
  const dispatch = useDispatch();

  useEffect(() => {
    if (data?.currentUserId) {
      dispatch(setCurrentUser(data.currentUserId));
    }
  }, [dispatch, data?.currentUserId]);

  useEffect(() => {
    if (newSession) {
      const pathname =
        userAppState.current?.returnTo || "/tenant/system/getting-started";
      window.location.href = `${
        window.location.href.split(window.location.pathname)[0]
      }${pathname}`;
    }
  }, [newSession]);

  const onRedirectCallback = (appState?: AppState) => {
    userAppState.current = appState;
  };

  if (loading || newSession) {
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
              onRedirectCallback={onRedirectCallback}
            >
              <VerifyUser setNewSession={setNewSession} returnTo={returnTo} />
            </Auth0Provider>
          )}
        />
        <Redirect from="*" to="/login" />
      </Switch>
    );
  }
};

const VerifyUser = ({
  setNewSession,
  returnTo
}: {
  setNewSession: Function;
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

  if (isLoading) {
    return <Loading />;
  } else if (isAuthenticated) {
    return <CreateSession setNewSession={setNewSession} />;
  } else {
    return <LoginPage loginHandler={loginHandler} />;
  }
};

const LoginPage = ({
  loginHandler
}: {
  loginHandler: React.MouseEventHandler<HTMLButtonElement>;
}) => {
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

const CreateSession = ({ setNewSession }: { setNewSession: Function }) => {
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

        if (response.data?.currentUserId) {
          dispatch(setCurrentUser(response.data.currentUserId));
          setNewSession(true);
        }

        // todo: inspect response to see if successful, maybe email is not in the users table
      } catch (e) {
        console.error(e);
      }
    })();
  }, [getAccessTokenSilently, dispatch, setNewSession]);

  return <Loading />;
};
