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
import { useDispatch } from "react-redux";
import { saveAs } from "file-saver";

import { Integration } from "state/integration/types";

import * as commands from "./templates/commands";
import { makePrometheusDashboardRequests } from "./dashboards";

import * as grafana from "client/utils/grafana";

import { updateGrafanaStateForIntegration } from "state/integration/actions";

import { CopyToClipboardIcon } from "client/components/CopyToClipboard";
import { ViewConfigDialogBtn } from "client/integrations/common/ViewConfigDialogBtn";

import { Box } from "client/components/Box";
import { Card, CardContent, CardHeader } from "client/components/Card";
import { Button } from "client/components/Button";

import Timeline from "@material-ui/lab/Timeline";
import TimelineItem from "@material-ui/lab/TimelineItem";
import TimelineSeparator from "@material-ui/lab/TimelineSeparator";
import TimelineConnector from "@material-ui/lab/TimelineConnector";
import TimelineContent from "@material-ui/lab/TimelineContent";
import TimelineDot from "@material-ui/lab/TimelineDot";

import styled from "styled-components";
import { Tenant } from "state/tenant/types";

const TimelineDotWrapper = styled(TimelineDot)`
  padding-left: 10px;
  padding-right: 10px;
`;

const TimelineWrapper = styled(Timeline)`
  .MuiTimelineItem-missingOppositeContent:before {
    flex: 0;
    padding: 0;
  }
`;

type InstallInstructionsProps = {
  tenant: Tenant;
  integration: Integration;
  isDashboardInstalled: boolean;
  config: string;
};

export const InstallInstructions = ({
  integration,
  tenant,
  isDashboardInstalled,
  config
}: InstallInstructionsProps) => {
  const dispatch = useDispatch();

  const configFilename = useMemo(
    () => `opstrace-${tenant.name}-integration-${integration.kind}.yaml`,
    [tenant.name, integration.kind]
  );

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
    const folder = await grafana.createFolder({ integration, tenant });

    for (const d of makePrometheusDashboardRequests({
      integrationId: integration.id,
      folderId: folder.id
    })) {
      await grafana.createDashboard(tenant, d);
    }

    dispatch(
      updateGrafanaStateForIntegration({
        id: integration.id,
        grafanaMetadata: { folder_id: folder.id, folder_path: folder.urlPath }
      })
    );
  };

  return (
    <Box width="100%" height="100%" p={1}>
      <Card>
        <CardHeader
          titleTypographyProps={{ variant: "h5" }}
          title="Install Instructions"
        />
        <CardContent>
          <TimelineWrapper>
            <TimelineItem>
              <TimelineSeparator>
                <TimelineDotWrapper variant="outlined" color="primary">
                  1
                </TimelineDotWrapper>
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
                    <ViewConfigDialogBtn
                      filename={configFilename}
                      config={config}
                    />
                  </Box>
                </Box>
              </TimelineContent>
            </TimelineItem>
            <TimelineItem>
              <TimelineSeparator>
                <TimelineDotWrapper variant="outlined" color="primary">
                  2
                </TimelineDotWrapper>
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
                <TimelineDotWrapper variant="outlined" color="primary">
                  3
                </TimelineDotWrapper>
              </TimelineSeparator>
              <TimelineContent>
                <Box flexGrow={1} pb={2}>
                  Install Dashboards for this Integration.
                  <br />
                  <br />
                  <Button
                    variant="contained"
                    size="small"
                    state="primary"
                    disabled={isDashboardInstalled}
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
  );
};
