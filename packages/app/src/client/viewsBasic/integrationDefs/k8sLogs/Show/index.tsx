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

import React, { useMemo } from "react";
import { useHistory } from "react-router-dom";
import { format, parseISO } from "date-fns";

import { IntegrationProps } from "client/viewsBasic/tenantIntegrations/utils";
import { IntegrationDefProps } from "client/viewsBasic/integrationDefs/utils";
import { installedIntegrationsPath } from "client/viewsBasic/tenantIntegrations/paths";
import { grafanaUrl } from "client/viewsBasic/paths";

import { withTenantFromParams, TenantProps } from "client/views/tenant/utils";

import { promtailYaml, PromtailLogFormat } from "./templates/config";

import IntegrationStatus from "client/viewsBasic/integrationDefs/k8sLogs/Status";

import useHasuraSubscription from "client/hooks/useHasuraSubscription";

import { CondRender } from "client/utils/rendering";

import { InstallInstructions } from "./InstallInstructions";
import { UninstallInstructions } from "./UninstallInstructions";

import { Box } from "client/components/Box";
import Attribute from "client/components/Attribute";
import { Card, CardContent, CardHeader } from "client/components/Card";
import { Button } from "client/components/Button";

import { ExternalLink } from "client/components/Link";
import { ArrowLeft } from "react-feather";

const INTEGRATION_STATUS_SUBSCRIPTION = `
  subscription IntegrationUpdates($id: uuid!) {
    integrations_by_pk(id: $id) {
      status
      grafana_metadata
      updated_at
    }
  }
`;

export const K8sLogsShow = withTenantFromParams(
  ({
    integration,
    integrationDef,
    tenant
  }: IntegrationProps & IntegrationDefProps & TenantProps) => {
    const history = useHistory();

    const { data: subData } = useHasuraSubscription(
      INTEGRATION_STATUS_SUBSCRIPTION,
      {
        id: integration.id
      }
    );

    const [isDashboardInstalled, grafanaFolderPath] = useMemo(() => {
      const latestMetadata =
        subData?.integrations_by_pk?.grafana_metadata ||
        integration.grafana_metadata;

      return [
        latestMetadata?.folder_path !== undefined,
        latestMetadata?.folder_path
      ];
    }, [
      subData?.integrations_by_pk?.grafana_metadata,
      integration.grafana_metadata
    ]);

    const config = useMemo(
      () =>
        promtailYaml({
          clusterHost: window.location.host,
          tenantName: tenant.name,
          integrationId: integration.id,
          deployNamespace: integration.data.deployNamespace,
          // TODO: allow user to select dockerd or cri/containerd (different log formats)
          logFormat: PromtailLogFormat.CRI
        }),
      [tenant.name, integration.id, integration.data.deployNamespace]
    );

    return (
      <>
        <Box width="100%" height="100%" p={1}>
          <Box mb={2}>
            <Button
              size="small"
              startIcon={<ArrowLeft />}
              onClick={() =>
                history.push(installedIntegrationsPath({ tenant }))
              }
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
                    <IntegrationStatus
                      integration={integration}
                      tenant={tenant}
                    />
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
                  <Attribute.Value>{integrationDef.label}</Attribute.Value>
                  <Attribute.Value>
                    {format(parseISO(integration.created_at), "Pppp")}
                  </Attribute.Value>
                </Box>
                <CondRender when={isDashboardInstalled}>
                  <Attribute.Key>
                    <ExternalLink
                      target="_blank"
                      href={`${grafanaUrl({ tenant })}${grafanaFolderPath}`}
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
  }
);
