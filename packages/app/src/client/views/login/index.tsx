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

import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";

import { Auth0Provider, useAuth0, AppState } from "@auth0/auth0-react";
import { GeneralServerError } from "server/errors";
import { Box } from "client/components/Box";
import { Page } from "client/components/Page";
import { Button } from "client/components/Button";
import { Typography } from "client/components/Typography";
import { useCommandService } from "client/services/Command";
import { ErrorView } from "client/components/Error";
import useQueryParams from "client/hooks/useQueryParams";
import TracyImg from "../common/Tracy";

interface State extends AppState {
  redirectUri: string;
}

const Login = (props: { state?: State }) => {
  const {
    logout,
    isAuthenticated,
    user,
    getAccessTokenSilently,
    loginWithRedirect
  } = useAuth0();

  const [
    accessDeniedError,
    setAccessDeniedError
  ] = useState<GeneralServerError | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  // This will look for a param like so: /login?rd=%2Fgrafana
  // NOTE: rd must include the host, relative paths do not work.
  const { rd } = useQueryParams<{ rd?: string }>();
  const auth0Login = useCallback(() => {
    loginWithRedirect({
      redirectUri: window.location.href,
      appState: {
        // this is the redirect uri to navigate to after we've successfully created a session
        redirectUri: rd
      }
    });
  }, [loginWithRedirect, rd]);

  // first get the accessToken from Auth0
  useEffect(() => {
    (async function getAccessToken() {
      try {
        const token = await getAccessTokenSilently({
          audience: "https://user-cluster.opstrace.io/api"
        });
        setAccessToken(token);
      } catch (e) {}
    })();
  }, [isAuthenticated, getAccessTokenSilently]);

  // second, create a session within the cluster, using the accessToken
  useEffect(() => {
    if (!accessToken || !user) {
      return;
    }
    (async function createSession() {
      try {
        // create a session
        await axios.request({
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

        if (props.state?.redirectUri) {
          window.location.href = props.state.redirectUri.startsWith("http")
            ? props.state.redirectUri
            : `https://${decodeURIComponent(props.state.redirectUri)}`;
        } else {
          window.location.pathname = "/";
        }
      } catch (e) {
        if (GeneralServerError.isInstance(e.response.data)) {
          setAccessDeniedError(e.response.data);
        } else {
          console.error(e);
        }
      }
    })();
  }, [accessToken, user, props.state?.redirectUri]);

  useCommandService(
    {
      id: "login-on-enter",
      description: "Login",
      keybindings: ["enter"],
      handler: () => {
        if (!accessToken) {
          auth0Login();
        }
      }
    },
    [accessToken]
  );

  // The login flow succeeded (identity communicated and verified), but on the
  // it was detected that this particular user does not have access to the
  // cluster.
  if (accessDeniedError) {
    return (
      <ErrorView
        title="Unauthorized"
        subheader=""
        actions={null}
        emoji="💩"
        maxWidth={400}
      >
        <Typography>Access denied for {user.email}.</Typography>
        <br />
        <br />
        <Typography>
          Contact your administrator or Logout and try again with a different
          account.
        </Typography>
        <Box mt={3} pb={0}>
          <Button
            variant="contained"
            state="primary"
            size="large"
            onClick={() => logout({ returnTo: window.location.href })}
          >
            Logout
          </Button>
        </Box>
      </ErrorView>
    );
  }

  return (
    <>
      <Box display="flex" alignItems="center" p={1}>
        <Button
          disabled={!!accessToken}
          variant="contained"
          state="primary"
          size="large"
          onClick={() => auth0Login()}
        >
          Login
        </Button>
      </Box>
      <Box display="flex" alignItems="center" p={1}>
        <Typography color="textSecondary"> Hit ENTER to login.</Typography>
      </Box>
    </>
  );
};

const LoginPage = () => {
  const [state, setState] = useState<State | undefined>();

  const onRedirectCallback = useCallback((state: AppState) => {
    setState(state as State);
  }, []);
  return (
    <Page>
      <Auth0Provider
        domain="opstrace-dev.us.auth0.com"
        clientId="vs6bgTunbVK4dvdLRj02DptWjOmAVWVM"
        audience="https://user-cluster.opstrace.io/api"
        scope="email openid profile"
        useRefreshTokens={true}
        redirectUri={window.location.origin}
        onRedirectCallback={onRedirectCallback}
      >
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
            <Login state={state} />
          </Box>
        </Box>
      </Auth0Provider>
    </Page>
  );
};

export default LoginPage;
