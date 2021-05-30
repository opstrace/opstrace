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

import { Tenant } from "state/tenant/types";
import { Integration } from "state/integration/types";

import { UninstallBtn } from "client/integrations/common/UninstallIntegrationBtn";

import { Box } from "client/components/Box";
import { Card, CardContent, CardHeader } from "client/components/Card";

type Props = {
  tenant: Tenant;
  integration: Integration;
};

export const Actions = ({ integration, tenant }: Props) => {
  return (
    <Box width="100%" height="100%" p={1}>
      <Card>
        <CardHeader titleTypographyProps={{ variant: "h5" }} title="Actions" />
        <CardContent>
          <Box flexGrow={1} pb={2}>
            <UninstallBtn
              integration={integration}
              tenant={tenant}
              disabled={false}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
