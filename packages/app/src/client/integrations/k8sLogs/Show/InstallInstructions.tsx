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

import React, { useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";

import { Integration } from "state/integration/types";

import * as commands from "./templates/commands";
import { makePromtailDashboardRequests } from "./dashboards";

import { useSimpleNotification } from "client/services/Notification";
import * as grafana from "client/utils/grafana";

import { updateGrafanaStateForIntegration } from "state/integration/actions";

import DownloadConfigButton from "client/integrations/common/DownloadConfigButton";
import { ViewConfigDialogBtn } from "client/integrations/common/ViewConfigDialogBtn";
import { getConfigFileName } from "client/integrations/configUtils";

import { Box } from "client/components/Box";
import { Button } from "client/components/Button";
import { Card, CardContent, CardHeader } from "client/components/Card";
import { CopyToClipboardIcon } from "client/components/CopyToClipboard";

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
  const configFilename = getConfigFileName(tenant, integration);

  const deployCommand = useMemo(
    () => commands.deployYaml(configFilename, tenant.name),
    [tenant.name, configFilename]
  );

  const { registerNotification } = useSimpleNotification();

  const notifyError = useCallback(
    (title: string, message: string) => {
      registerNotification({
        state: "error" as const,
        title,
        information: message
      });
    },
    [registerNotification]
  );

  const dashboardHandler = async () => {
    let folder = null;
    try {
      folder = await grafana.createFolder({ integration, tenant });
    } catch (err) {
      console.log(err);
      notifyError(
        `Could not create grafana integration dashboard folder ${integration}`,
        err.response.statusText
      );
      return;
    }

    for (const d of makePromtailDashboardRequests({
      integrationId: integration.id,
      folderId: folder.id
    })) {
      try {
        await grafana.createDashboard(tenant, d);
      } catch (err) {
        console.log(err);
        notifyError(
          `Could not create grafana integration dashboard`,
          err.response.statusText
        );
      }
    }

    dispatch(
      updateGrafanaStateForIntegration({
        id: integration.id,
        grafana: { folder }
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
                    <DownloadConfigButton
                      filename={configFilename}
                      config={config}
                    >
                      Download YAML
                    </DownloadConfigButton>
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
                  {`Run this command to install Promtail`}
                  <Box pl={2}>
                    <code>{deployCommand}</code>
                    <CopyToClipboardIcon text={deployCommand} />
                  </Box>
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
