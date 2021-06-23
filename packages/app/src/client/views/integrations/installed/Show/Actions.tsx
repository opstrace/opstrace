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
import { isFunction } from "ramda-adjunct";

import {
  IntegrationProps,
  IntegrationPluginAction
} from "client/integrations/types";

import { UninstallBtn } from "client/integrations/common/UninstallIntegrationBtn";

import { Box } from "client/components/Box";
import { Card, CardContent, CardHeader } from "client/components/Card";

export const Actions = (props: IntegrationProps) => {
  const { plugin } = props;
  let actions: IntegrationPluginAction[] = [];

  if (
    plugin.canUninstall === true ||
    (isFunction(plugin.canUninstall) && plugin.canUninstall(props))
  )
    actions = [
      {
        label: "Uninstall",
        Component: UninstallBtn
      }
    ];

  actions = [...actions, ...(plugin.actions || [])];

  if (actions.length < 1) return null;

  return (
    <Box width="100%" height="100%" p={1}>
      <Card>
        <CardHeader titleTypographyProps={{ variant: "h5" }} title="Actions" />
        <CardContent>
          {actions.map(action => (
            <Box flexGrow={1} pb={2}>
              <action.Component {...props} />
            </Box>
          ))}
        </CardContent>
      </Card>
    </Box>
  );
};
