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
import { saveAs } from "file-saver";

import Timeline from "@material-ui/lab/Timeline";
import TimelineItem from "@material-ui/lab/TimelineItem";
import TimelineSeparator from "@material-ui/lab/TimelineSeparator";
import TimelineConnector from "@material-ui/lab/TimelineConnector";
import TimelineContent from "@material-ui/lab/TimelineContent";
import TimelineDot from "@material-ui/lab/TimelineDot";

import { IntegrationProps } from "client/viewsBasic/tenantIntegrations/utils";
import { IntegrationDefProps } from "client/viewsBasic/integrationDefs/utils";

import { withTenantFromParams, TenantProps } from "client/views/tenant/utils";

import { prometheusYaml } from "./templates/config";
import * as commands from "./templates/commands";
import {
  makeFolderRequest,
  makePrometheusDashboardRequests
} from "./dashboards";

import {
  createFolder,
  createDashboard
} from "client/viewsBasic/integrationDefs/common/grafana";
import { IntegrationStatus } from "./Status";
import { CopyToClipboardIcon } from "client/viewsBasic/common/CopyToClipboard";

import useHasuraSubscription from "client/hooks/useHasuraSubscription";

import graphqlClient from "state/clients/graphqlClient";

import { CondRender } from "client/utils/rendering";

import { ViewConfigButtonModal } from "client/viewsBasic/integrationDefs/common/ViewConfigButtonModal";

import { Box } from "client/components/Box";
import Attribute from "client/components/Attribute";
import { Card, CardContent, CardHeader } from "client/components/Card";
import { Button } from "client/components/Button";

import styled from "styled-components";
import { ExternalLink } from "client/components/Link";
import { ArrowLeft } from "react-feather";

const TimelineWrapper = styled(Timeline)`
  .MuiTimelineItem-missingOppositeContent:before {
    flex: 0;
  }
`;

const INTEGRATION_STATUS_SUBSCRIPTION = `
  subscription IntegrationUpdates($id: uuid!) {
    integrations_by_pk(id: $id) {
      status
      grafana_metadata
      updated_at
    }
  }
`;

export const K8sMetricsShow = withTenantFromParams(
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

    const grafanaMetadata = useMemo(() => {
      return (
        subData?.integrations_by_pk?.grafana_metadata ||
        integration.grafana_metadata
      );
    }, [
      subData?.integrations_by_pk?.grafana_metadata,
      integration.grafana_metadata
    ]);

    const configFilename = useMemo(
      () => `opstrace-${tenant.name}-integration-${integration.kind}.yaml`,
      [tenant.name, integration.kind]
    );

    const config = useMemo(() => {
      return prometheusYaml({
        clusterHost: window.location.host,
        tenantName: tenant.name,
        integrationId: integration.id,
        deployNamespace: integration.data.deployNamespace
      });
    }, [tenant.name, integration.id, integration.data.deployNamespace]);

    const deployYamlCommand = useMemo(
      () => commands.deployYaml(configFilename, tenant.name),
      [tenant.name, configFilename]
    );

    const downloadHandler = () => {
      var configBlob = new Blob([config], {
        type: "application/x-yaml;charset=utf-8"
      });
      saveAs(configBlob, configFilename);
    };

    const dashboardHandler = async () => {
      const folder = await createFolder(
        tenant.name,
        makeFolderRequest({
          integrationId: integration.id,
          integrationName: integration.name
        })
      );

      for (const d of makePrometheusDashboardRequests({
        integrationId: integration.id,
        folderId: folder.id
      })) {
        await createDashboard(tenant.name, d);
      }

      await graphqlClient.UpdateIntegrationGrafanaMetadata({
        id: integration.id,
        grafana_metadata: {
          folder_id: folder.id,
          folder_path: folder.urlPath as string
        }
      });
    };

    return (
      <>
        <Box width="100%" height="100%" p={1}>
          <Box mb={2}>
            <Button
              size="small"
              onClick={() =>
                history.push(`/tenant/${tenant.name}/integrations/installed`)
              }
            >
              <ArrowLeft width={20} height={20} /> Installed Integrations
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
                  <CondRender present={grafanaMetadata?.folder_path}>
                    <Attribute.Key> </Attribute.Key>
                  </CondRender>
                </Box>
                <Box display="flex" flexDirection="column" flexGrow={1}>
                  <Attribute.Value>{integrationDef.label}</Attribute.Value>
                  <Attribute.Value>
                    {format(parseISO(integration.created_at), "Pppp")}
                  </Attribute.Value>
                </Box>
                <CondRender present={grafanaMetadata?.folder_path}>
                  <Attribute.Key>
                    <ExternalLink
                      target="_blank"
                      href={`${window.location.protocol}//${tenant.name}.${window.location.host}${grafanaMetadata?.folder_path}`}
                    >
                      View Grafana Dashboards
                    </ExternalLink>
                  </Attribute.Key>
                </CondRender>
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box
          width="100%"
          height="100%"
          display="flex"
          justifyContent="center"
          alignItems="center"
          flexWrap="wrap"
          p={1}
        >
          <Card>
            <CardHeader
              titleTypographyProps={{ variant: "h5" }}
              title="Install Instructions"
            />
            <CardContent>
              <TimelineWrapper>
                <TimelineItem>
                  <TimelineSeparator>
                    <TimelineDot />
                    <TimelineConnector />
                  </TimelineSeparator>
                  <TimelineContent>
                    <Box flexGrow={1} pb={2}>
                      {`Download the generated config YAML and save to the same
                    location as the api key for Tenant "${tenant.name}", it should be called "tenant-api-token-${tenant.name}".`}
                      <Box pt={1}>
                        <Button
                          style={{ marginRight: 20 }}
                          variant="contained"
                          size="small"
                          state="primary"
                          onClick={downloadHandler}
                        >
                          Download YAML
                        </Button>
                        <ViewConfigButtonModal
                          filename={configFilename}
                          config={config}
                        />
                      </Box>
                    </Box>
                  </TimelineContent>
                </TimelineItem>
                <TimelineItem>
                  <TimelineSeparator>
                    <TimelineDot />
                    <TimelineConnector />
                  </TimelineSeparator>
                  <TimelineContent>
                    <Box flexGrow={1} pb={2}>
                      {`Run this command to install Prometheus`}
                      <br />
                      <code>{deployYamlCommand}</code>
                      <CopyToClipboardIcon text={deployYamlCommand} />
                    </Box>
                  </TimelineContent>
                </TimelineItem>
                <TimelineItem>
                  <TimelineSeparator>
                    <TimelineDot />
                  </TimelineSeparator>
                  <TimelineContent>
                    <Box flexGrow={1} pb={2}>
                      Once the integration is installed in your namepsace we can
                      install our default set of Grafana Dashboards for you.
                      <br />
                      <br />
                      <Button
                        variant="contained"
                        size="small"
                        state="primary"
                        disabled={grafanaMetadata.folder_path !== undefined}
                        onClick={dashboardHandler}
                      >
                        Install Dashboards
                      </Button>
                    </Box>
                  </TimelineContent>
                </TimelineItem>
              </TimelineWrapper>
            </CardContent>
          </Card>
        </Box>
      </>
    );
  }
);
