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

import { IntegrationProps } from "client/integrations/types";

import { Box } from "client/components/Box";
import Attribute from "client/components/Attribute";
import { Typography } from "client/components/Typography";
import { ExternalLink } from "client/components/Link";

const Details = ({ integration }: IntegrationProps) => {
  const config = integration.data.config;
  return (
    <>
      <Box mb={3}>
        <Typography variant="h5">Configuration Flags</Typography>
        <Typography
          variant="subtitle2"
          color="textSecondary"
          gutterBottom={true}
        >
          See the{" "}
          <ExternalLink
            target="_blank"
            href="https://github.com/prometheus-community/stackdriver_exporter#flags"
          >
            documentation
          </ExternalLink>{" "}
          for further details
        </Typography>
      </Box>
      <Box display="flex">
        <Box display="flex" flexDirection="column">
          <Attribute.Key>google.project-id</Attribute.Key>
          <Attribute.Key>monitoring.metrics-type-prefixes</Attribute.Key>
          <Attribute.Key>monitoring.metrics-interval</Attribute.Key>
          <Attribute.Key>monitoringMetricsOffset</Attribute.Key>
        </Box>
        <Box display="flex" flexDirection="column" flexGrow={1}>
          <Attribute.Value>
            {config["google.project-id"].join(",")}
          </Attribute.Value>
          <Attribute.Value>
            {config["monitoring.metrics-type-prefixes"].join(",")}
          </Attribute.Value>
          <Attribute.Value>
            {config["monitoring.metrics-interval"]}
          </Attribute.Value>
          <Attribute.Value>
            {config["monitoring.metrics-offset"]}
          </Attribute.Value>
        </Box>
      </Box>
    </>
  );
};

const showSection = { label: "Details", Component: Details };
export default showSection;
