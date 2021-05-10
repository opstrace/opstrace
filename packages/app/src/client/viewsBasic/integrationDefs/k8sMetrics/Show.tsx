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

import { IntegrationProps } from "client/viewsBasic/tenantIntegrations/utils";
import { IntegrationDefProps } from "client/viewsBasic/integrationDefs/utils";

import { Box } from "client/components/Box";
import Attribute from "client/components/Attribute";
import { Card, CardContent, CardHeader } from "client/components/Card";

export const K8sMetricsShow = ({
  integration,
  integrationDef
}: IntegrationProps & IntegrationDefProps) => {
  return (
    <Box
      width="100%"
      height="100%"
      display="flex"
      justifyContent="center"
      alignItems="center"
      flexWrap="wrap"
      p={1}
    >
      <Box maxWidth={700}>
        <Card p={3}>
          <CardHeader
            titleTypographyProps={{ variant: "h5" }}
            title={integration.name}
          />
          <CardContent>
            <Box display="flex">
              <Box display="flex" flexDirection="column">
                <Attribute.Key>Kind:</Attribute.Key>
                <Attribute.Key>Category:</Attribute.Key>
                <Attribute.Key>Status:</Attribute.Key>
                <Attribute.Key>Created:</Attribute.Key>
              </Box>
              <Box display="flex" flexDirection="column" flexGrow={1}>
                <Attribute.Value>{integrationDef.kind}</Attribute.Value>
                <Attribute.Value>{integrationDef.category}</Attribute.Value>
                <Attribute.Value>{integration.status}</Attribute.Value>
                <Attribute.Value>{integration.created_at}</Attribute.Value>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};
