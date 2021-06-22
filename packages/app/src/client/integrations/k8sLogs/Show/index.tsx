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

import React, { useMemo, useEffect } from "react";
import { useDispatch } from "react-redux";
import { useHistory } from "react-router-dom";
import { format, parseISO } from "date-fns";

import { IntegrationShowProps } from "client/integrations/types";
import { installedIntegrationsPath } from "client/integrations/paths";
import {
  grafanaUrl
  // useFolder as useGrafanaFolder
} from "client/utils/grafana";

import { promtailYaml, PromtailLogFormat } from "./templates/config";

import Status from "client/integrations/k8sLogs/Status";

import { CondRender } from "client/utils/rendering";

import { loadGrafanaStateForIntegration } from "state/integration/actions";

import { InstallInstructions } from "./InstallInstructions";
import { UninstallInstructions } from "./UninstallInstructions";

import { Box } from "client/components/Box";
import Attribute from "client/components/Attribute";
import { Card, CardContent, CardHeader } from "client/components/Card";
import { Button } from "client/components/Button";
import { ExternalLink } from "client/components/Link";
import { ArrowLeft } from "react-feather";

export const K8sLogsShow = ({
  integration,
  tenant,
  plugin
}: IntegrationShowProps) => {
  const dispatch = useDispatch();
  const history = useHistory();

  useEffect(() => {
    if (integration?.id)
      dispatch(loadGrafanaStateForIntegration({ id: integration.id }));
  }, [dispatch, integration?.id]);

  const isDashboardInstalled = useMemo(
    () => !!integration?.grafana?.folder?.id,
    [integration?.grafana?.folder?.id]
  );

  const config = useMemo(() => {
    if (integration?.id) {
      return promtailYaml({
        clusterHost: window.location.host,
        tenantName: tenant.name,
        integrationId: integration?.id,
        deployNamespace: integration?.data.deployNamespace,
        // TODO: allow user to select dockerd or cri/containerd (different log formats)
        logFormat: PromtailLogFormat.CRI
      });
    }
    return "";
  }, [tenant.name, integration?.id, integration?.data.deployNamespace]);

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
            avatar={<img src={plugin.Logo} width={80} height={80} alt="" />}
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
                <CondRender when={isDashboardInstalled}>
                  <Attribute.Key> </Attribute.Key>
                </CondRender>
              </Box>
              <Box display="flex" flexDirection="column" flexGrow={1}>
                <Attribute.Value>{plugin.label}</Attribute.Value>
                <Attribute.Value>
                  {format(parseISO(integration.created_at), "Pppp")}
                </Attribute.Value>
              </Box>
              <CondRender when={isDashboardInstalled}>
                <Attribute.Key>
                  <ExternalLink
                    target="_blank"
                    href={`${grafanaUrl({
                      tenant
                    })}${integration.grafana?.folder?.path}`}
                  >
                    <Button state="primary" variant="outlined" size="medium">
                      View Grafana Dashboards
                    </Button>
                  </ExternalLink>
                </Attribute.Key>
              </CondRender>
            </Box>
          </CardContent>
        </Card>
      </Box>
      <InstallInstructions
        integration={integration}
        tenant={tenant}
        isDashboardInstalled={isDashboardInstalled}
        config={config}
      />
      <UninstallInstructions
        integration={integration}
        tenant={tenant}
        isDashboardInstalled={isDashboardInstalled}
        config={config}
      />
    </>
  );
};
