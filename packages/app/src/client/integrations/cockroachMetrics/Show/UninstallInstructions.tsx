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

import { Box } from "client/components/Box";
import { Card, CardContent, CardHeader } from "client/components/Card";
import { CopyToClipboardIcon } from "client/components/CopyToClipboard";
import { Typography } from "client/components/Typography";

import DownloadConfigButton from "client/integrations/common/DownloadConfigButton";
import { ViewConfigDialogBtn } from "client/integrations/common/ViewConfigDialogBtn";
import { UninstallBtn } from "client/integrations/common/UninstallIntegrationBtn";
import { getConfigFileName } from "client/integrations/configUtils";

import Timeline from "@material-ui/lab/Timeline";
import TimelineItem from "@material-ui/lab/TimelineItem";
import TimelineSeparator from "@material-ui/lab/TimelineSeparator";
import TimelineConnector from "@material-ui/lab/TimelineConnector";
import TimelineContent from "@material-ui/lab/TimelineContent";
import TimelineDot from "@material-ui/lab/TimelineDot";

import styled from "styled-components";
import { Integration } from "state/integration/types";
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
type UnInstallInstructionsProps = {
  tenant: Tenant;
  integration: Integration;
  isDashboardInstalled: boolean;
  config: string;
};

export const UninstallInstructions = ({
  integration,
  tenant,
  config
}: UnInstallInstructionsProps) => {
  const configFilename = getConfigFileName(tenant, integration);

  const [downloadInstructions, deleteInstructions, deleteCommand] = useMemo(
    () =>
      integration.data.mode === "k8s"
        ? [
            "Use the previously downloaded config YAML or download it again.",
            `Run this command to delete the metrics agent and ${integration.data.k8s.deployNamespace} namespace from your cluster`,
            `kubectl delete -f ${configFilename}`
          ]
        : [
            null,
            <Typography>
              Stop the <code>grafana-agent</code> process and then delete the
              configuration file(s)
            </Typography>,
            `rm -v ${configFilename} ${configFilename}.tmpl`
          ],
    [integration.data, configFilename]
  );

  return (
    <Box width="100%" height="100%" p={1}>
      <Card>
        <CardHeader
          titleTypographyProps={{ variant: "h5" }}
          title="Uninstall Instructions"
        />
        <CardContent>
          <TimelineWrapper>
            {downloadInstructions && (
              <TimelineItem>
                <TimelineSeparator>
                  <TimelineDotWrapper variant="outlined" color="primary">
                    1
                  </TimelineDotWrapper>
                  <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent>
                  <Box flexGrow={1} pb={2}>
                    {downloadInstructions}
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
            )}
            <TimelineItem>
              <TimelineSeparator>
                <TimelineDotWrapper variant="outlined" color="primary">
                  {(downloadInstructions && 2) || 1}
                </TimelineDotWrapper>
                <TimelineConnector />
              </TimelineSeparator>
              <TimelineContent>
                <Box flexGrow={1} pb={2}>
                  {deleteInstructions}
                  <Box pl={2}>
                    <code>{deleteCommand}</code>
                    <CopyToClipboardIcon text={deleteCommand} />
                  </Box>
                </Box>
              </TimelineContent>
            </TimelineItem>
            <TimelineItem>
              <TimelineSeparator>
                <TimelineDotWrapper variant="outlined" color="primary">
                  {(downloadInstructions && 3) || 2}
                </TimelineDotWrapper>
              </TimelineSeparator>
              <TimelineContent>
                <Box flexGrow={1} pb={2}>
                  Uninstall this Integration including Dashboards.
                  <br />
                  <UninstallBtn
                    integration={integration}
                    tenant={tenant}
                    disabled={false}
                  />
                </Box>
              </TimelineContent>
            </TimelineItem>
          </TimelineWrapper>
        </CardContent>
      </Card>
    </Box>
  );
};
