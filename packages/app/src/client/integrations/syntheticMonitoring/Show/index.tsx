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
import { useHistory } from "react-router-dom";
import { format, parseISO } from "date-fns";

import { IntegrationShowProps } from "client/integrations/types";
import { installedIntegrationsPath } from "client/integrations/paths";

import Status from "client/integrations/syntheticMonitoring/Status";
import { Actions } from "./Actions";

import { Box } from "client/components/Box";
import Attribute from "client/components/Attribute";
import { Card, CardContent, CardHeader } from "client/components/Card";
import { Button } from "client/components/Button";
import { ArrowLeft } from "react-feather";

export const SyntheticMonitoringShow = ({
  integration,
  tenant,
  integrationDef
}: IntegrationShowProps) => {
  const history = useHistory();

  return (
    <>
      <Box width="100%" height="100%" p={1}>
        <Box mb={2}>
          <Button
            size="small"
            startIcon={<ArrowLeft />}
            onClick={() => history.push(installedIntegrationsPath({ tenant }))}
          >
            Installed Integrations
          </Button>
        </Box>
        <Card>
          <CardHeader
            avatar={
              <img src={integrationDef.Logo} width={80} height={80} alt="" />
            }
            titleTypographyProps={{ variant: "h1" }}
            title={integration.name}
            action={
              <Box ml={3} display="flex" flexWrap="wrap">
                <Box p={1}>
                  <Status integration={integration} tenant={tenant} />
                </Box>
              </Box>
            }
          />
          <CardContent>
            <Box display="flex">
              <Box display="flex" flexDirection="column">
                <Attribute.Key>Integration:</Attribute.Key>
                <Attribute.Key>Created:</Attribute.Key>
              </Box>
              <Box display="flex" flexDirection="column" flexGrow={1}>
                <Attribute.Value>{integrationDef.label}</Attribute.Value>
                <Attribute.Value>
                  {format(parseISO(integration.created_at), "Pppp")}
                </Attribute.Value>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
      <Actions integration={integration} tenant={tenant} />
    </>
  );
};

export default SyntheticMonitoringShow;
