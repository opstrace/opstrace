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

import { Page } from "client/components/Page";
import { Box } from "client/components/Box";
import { Typography } from "client/components/Typography";

import accessDeniedSvg from "./loadingStages/tracy-status-check.svg";
import auth0Svg from "./loadingStages/tracy-auth0.svg";
import createSessionSvg from "./loadingStages/tracy-create-session.svg";
import errorSvg from "./loadingStages/tracy-error.svg";
import logoutSvg from "./loadingStages/tracy-logout.svg";
import statusCheckSvg from "./loadingStages/tracy-status-check.svg";

const STAGES: Record<string, any> = {
  "access-denied": accessDeniedSvg,
  auth0: auth0Svg,
  "create-session": createSessionSvg,
  error: errorSvg,
  logout: logoutSvg,
  "status-check": statusCheckSvg
};

type LoadingPageProps = {
  stage: string;
};

export const LoadingPage = ({ stage }: LoadingPageProps) => (
  <Page centered height="100vh" width="100vw">
    <Box p={1} mb={4} display="flex" width="100%" justifyContent="center">
      <Box p={1} height={150} width={100}>
        <img src={STAGES[stage]} alt="" />
      </Box>
      <Box p={1} height={150} display="flex" alignItems="center">
        <Typography variant="h3">opstrace</Typography>
      </Box>
    </Box>
  </Page>
);
