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

import { Box } from "client/components/Box";
import Typography from "client/components/Typography/Typography";
import { useSelectedTenantWithFallback } from "state/tenant/hooks/useTenant";
import { Tabs } from "client/components/Tabs";

import Alerts from "./alerts";
import Configuration from "./configuration";

const Alerting = () => {
  const tenant = useSelectedTenantWithFallback();

  return (
    <>
      <Box pt={1} pb={4}>
        <Typography variant="h1">Alerting</Typography>
      </Box>
      <Tabs
        tabs={[
          {
            path: `/tenant/${tenant.name}/alerting/alerts`,
            title: "Alerts",
            component: Alerts
          },
          {
            path: `/tenant/${tenant.name}/alerting/configuration`,
            title: "Configuration",
            component: Configuration
          }
        ]}
      />
    </>
  );
};

export default Alerting;
