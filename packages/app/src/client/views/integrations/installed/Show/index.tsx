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

import { useSelectedIntegration } from "state/integration/hooks";
import { useSelectedTenant } from "state/tenant/hooks/useTenant";
import { integrationPluginRecords } from "client/integrations";

import { IntegrationProps } from "client/integrations/types";
import { installedIntegrationsPath } from "client/integrations/paths";
import { grafanaUrl } from "client/utils/grafana";

import { Sections } from "./Sections";
import { Actions } from "./Actions";

import { CondRender } from "client/utils/rendering";

import { loadGrafanaStateForIntegration } from "state/integration/actions";

import NotFound from "client/views/404/404";

import { ExternalLink } from "client/components/Link";
import { ArrowLeft } from "react-feather";
import { Box } from "client/components/Box";
import Attribute from "client/components/Attribute";
import { Card, CardContent, CardHeader } from "client/components/Card";
import { Button } from "client/components/Button";

export const ShowIntegration = () => {
  const integration = useSelectedIntegration();
  const tenant = useSelectedTenant();
  if (!integration || !tenant) return <NotFound />;

  const plugin = integrationPluginRecords[integration.kind];
  if (!plugin) return <NotFound />;

  return <Show integration={integration} tenant={tenant} plugin={plugin} />;
};

const Show = ({ integration, tenant, plugin }: IntegrationProps) => {
  const dispatch = useDispatch();
  const history = useHistory();

  useEffect(() => {
    dispatch(loadGrafanaStateForIntegration({ id: integration.id }));
  }, [dispatch, integration.id]);

  const logsUrl = useMemo(() => {
    const path = `orgId=1&left=%5B%22now-1h%22,%22now%22,%22logs%22,%7B%22expr%22:%22%7Bk8s_namespace_name%3D%5C%22${tenant.name}-tenant%5C%22,k8s_container_name%3D%5C%22exporter%5C%22,k8s_pod_name%3D~%5C%22%5Eintegration-${integration.key}-%5Ba-z0-9-%5D*%5C%22%7D%22%7D%5D`;
    return `${window.location.protocol}//system.${window.location.host}/grafana/explore?${path}`;
  }, [tenant.name, integration.key]);

  const metricsUrl = useMemo(() => {
    const path = `orgId=1&left=%5B%22now-1h%22,%22now%22,%22metrics%22,%7B%22expr%22:%22%7Bintegration_id%3D%5C%22${integration.id}%5C%22%7D%22%7D%5D`;
    return `${window.location.protocol}//${tenant.name}.${window.location.host}/grafana/explore?${path}`;
  }, [tenant.name, integration.id]);

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
                  <plugin.Status integration={integration} tenant={tenant} />
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
                <Attribute.Value>{plugin.label}</Attribute.Value>
                <Attribute.Value>
                  {format(parseISO(integration.created_at), "Pppp")}
                </Attribute.Value>
              </Box>
              <Box display="flex" flexDirection="column">
                <CondRender when={!!integration?.grafana?.folder?.id}>
                  <Attribute.Key>
                    <ExternalLink
                      target="_blank"
                      href={`${grafanaUrl({ tenant })}${
                        integration.grafana?.folder?.path
                      }`}
                    >
                      <Button state="primary" variant="outlined" size="medium">
                        Grafana Dashboard Folder
                      </Button>
                    </ExternalLink>
                  </Attribute.Key>
                </CondRender>
                <Attribute.Key>
                  <ExternalLink target="_blank" href={metricsUrl}>
                    <Button state="primary" variant="outlined" size="medium">
                      View Metrics
                    </Button>
                  </ExternalLink>
                </Attribute.Key>
                <Attribute.Key>
                  <ExternalLink target="_blank" href={logsUrl}>
                    <Button state="primary" variant="outlined" size="medium">
                      View Integration Logs
                    </Button>
                  </ExternalLink>
                </Attribute.Key>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
      <Sections integration={integration} tenant={tenant} plugin={plugin} />
      <Actions integration={integration} tenant={tenant} plugin={plugin} />
    </>
  );
};
