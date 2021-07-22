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
import { useAuth0 } from "@auth0/auth0-react";

import { loginUrl } from "client/components/withSession/paths";

import { Page } from "client/components/Page";
import { Box } from "client/components/Box";
import { Button } from "client/components/Button";
import { Typography } from "client/components/Typography";
import { ErrorView } from "client/components/Error";

export const AccessDeniedPage = () => {
  const { user, logout } = useAuth0();
  return (
    <Page centered height="100vh" width="100vw">
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
            onClick={() =>
              logout({
                returnTo: loginUrl()
              })
            }
          >
            Logout
          </Button>
        </Box>
      </ErrorView>
    </Page>
  );
};
