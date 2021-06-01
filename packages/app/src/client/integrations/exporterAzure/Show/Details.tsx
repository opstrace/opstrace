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

import { Integration } from "state/integration/types";

import { ViewConfig } from "client/integrations/common/ViewConfig";

import { Box } from "client/components/Box";
import Attribute from "client/components/Attribute";
import { Card, CardContent } from "client/components/Card";
import { Typography } from "client/components/Typography";
import { ExternalLink } from "client/components/Link";

type Props = {
  integration: Integration;
};

export const Details = ({ integration }: Props) => {
  const { credentials, config } = integration.data;
  return (
    <Box width="100%" height="100%" p={1}>
      <Card>
        <CardContent>
          <Box mb={2}>
            <Typography variant="subtitle1">Credentials</Typography>
            <Typography
              variant="subtitle2"
              color="textSecondary"
              gutterBottom={true}
            >
              This is for an <i>Unmanaged Identity</i>, see the{" "}
              <ExternalLink
                target="_blank"
                href="https://github.com/RobustPerception/azure_metrics_exporter#example-azure-metrics-exporter-config"
              >
                documentation
              </ExternalLink>{" "}
              for further information
            </Typography>
          </Box>

          <Box display="flex">
            <Box display="flex" flexDirection="column">
              <Attribute.Key>Subscription ID</Attribute.Key>
              <Attribute.Key>Tenant ID</Attribute.Key>
              <Attribute.Key>Client ID</Attribute.Key>
            </Box>
            <Box display="flex" flexDirection="column" flexGrow={1}>
              <Attribute.Value>
                {credentials["AZURE_SUBSCRIPTION_ID"]}
              </Attribute.Value>
              <Attribute.Value>
                {credentials["AZURE_TENANT_ID"]}
              </Attribute.Value>
              <Attribute.Value>
                {credentials["AZURE_CLIENT_ID"]}
              </Attribute.Value>
            </Box>
          </Box>

          <Box mt={2} mb={2}>
            <Typography variant="subtitle1">Configuration</Typography>
            <Typography
              variant="subtitle2"
              color="textSecondary"
              gutterBottom={true}
            >
              See the{" "}
              <ExternalLink
                target="_blank"
                href="https://github.com/RobustPerception/azure_metrics_exporter#example-azure-metrics-exporter-config"
              >
                documentation
              </ExternalLink>{" "}
              for further details
            </Typography>
          </Box>

          <ViewConfig
            filename={`integration-${integration.id}-config.yaml`}
            config={config}
          />
        </CardContent>
      </Card>
    </Box>
  );
};
