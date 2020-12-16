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
import * as rax from "retry-axios";

import axios, { AxiosError, AxiosResponse } from "axios";

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


interface LoginConfigInterface {
  auth0_client_id: string;
  auth0_domain: string;
}

interface State extends AppState {
  redirectUri: string;
}


// https://github.com/JustinBeckwith/retry-axios
// Attach rax "interceptor" to axios globally.
rax.attach();
const raxcfg = {
  // For requests that return a transient error (5xx).
  retry: 3,

  // For transient errors on transport level (DNS resolution, TCP connect()
  // timeout, recv() timeout)
  noResponseRetries: 3,

  // Constant delay between attempts.
  backoffType: "static" as "static",
  // Delay between attempts in ms
  retryDelay: 4000,

  // HTTP methods to automatically retry
  httpMethodsToRetry: ["GET", "DELETE", "PUT"],

  // The response status codes to retry. 2 tuple array: list of ranges.
  statusCodesToRetry: [
    [100, 199],
    [429, 429],
    [500, 599]
  ],

  onRetryAttempt: function(err: AxiosError) {
    const cfg = rax.getConfig(err);
    //@ts-ignore cfg possibly undefined
    console.log(`Retry attempt #${cfg.currentRetryAttempt} -- error: ${err}`);
  }
};

const axiosDefaultOpts = {
  // As this timeout constant does not only affect connect() timeout but also
  // response generation time, it needs to be used with care for those
  // HTTP endpoints that by definition can take _long_ to generate a response.
  timeout: 15000,
  raxConfig: raxcfg
};

// Read (non-senstive) UI client config from UI server component.
async function fetchLoginConfig(): Promise<LoginConfigInterface> {
  let response: AxiosResponse | undefined;
  try {
    response = await axios.get("/_/public-ui-config", axiosDefaultOpts);
  } catch (e) {
    // Expect this when axios could not get a good response after N retries.
    // Note(JP): It seems like there is some higher-level retry going on so
    // within the React machinery; so even when we don't handle this failure
    // here in any particular way things seem to recover.
    console.error("error during fetchAndSetLoginConfig:", e);
  }

  if (response === undefined) {
    throw new Error("could not GET /public-ui-config");
  }

  console.info(`got public-ui-config. data: `, response.data);

  const loginConfig: LoginConfigInterface = {
    auth0_client_id: response.data.auth0_client_id,
    auth0_domain: response.data.auth0_domain
  };

  return loginConfig;
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
  // cluster (make sure to call this only when `user.email` is defined).
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
          Contact your administrator or log out and try again with a different
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

function LoginPageParent() {
  // Uninitialized state will cause Child to error out
  const [loginConfig, setLoginConfig] = useState<LoginConfigInterface | undefined>();
  useEffect(() => {
    (async () => {
      const lcfg = await fetchLoginConfig();
      setLoginConfig(lcfg);
    })();
  });

  // Do not render child until loginconfig is populated. Kudos to
  // https://stackoverflow.com/a/57312722/145400 for the `{...loginConfig}` to
  // work around `not assignable to type 'IntrinsicAttributes..` kind of errors
  // when doing `loginconfig={loginconfig}`.
  return (
    <div>{loginConfig && <LoginPageChild {...loginConfig} />}</div>
  );
}

function LoginPageChild(lcfg: LoginConfigInterface) {
  const [state, setState] = useState<State | undefined>();

  const onRedirectCallback = useCallback((state: AppState) => {
    setState(state as State);
  }, []);

  return (
    <Page>
      <Auth0Provider
        domain={lcfg.auth0_domain}
        clientId={lcfg.auth0_client_id}
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
}

export default LoginPageParent;
