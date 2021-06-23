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
import { saveAs } from "file-saver";

import { IntegrationProps } from "client/integrations/types";

import { prometheusYaml } from "./templates/config";

import * as commands from "./templates/commands";

import { CopyToClipboardIcon } from "client/components/CopyToClipboard";
import { ViewConfigDialogBtn } from "client/integrations/common/ViewConfigDialogBtn";
import { UninstallBtn } from "client/integrations/common/UninstallIntegrationBtn";

import { Box } from "client/components/Box";
import { Button } from "client/components/Button";

import Timeline from "@material-ui/lab/Timeline";
import TimelineItem from "@material-ui/lab/TimelineItem";
import TimelineSeparator from "@material-ui/lab/TimelineSeparator";
import TimelineConnector from "@material-ui/lab/TimelineConnector";
import TimelineContent from "@material-ui/lab/TimelineContent";
import TimelineDot from "@material-ui/lab/TimelineDot";

import styled from "styled-components";

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

const UninstallInstructions = (props: IntegrationProps) => {
  const { integration, tenant } = props;
  const config = useMemo(() => {
    if (integration?.id) {
      return prometheusYaml({
        clusterHost: window.location.host,
        tenantName: tenant.name,
        integrationId: integration.id,
        deployNamespace: integration.data.deployNamespace
      });
    }
    return "";
  }, [tenant.name, integration?.id, integration?.data.deployNamespace]);

  const configFilename = useMemo(
    () => `opstrace-${tenant.name}-integration-${integration.kind}.yaml`,
    [tenant.name, integration.kind]
  );

  const deleteYamlCommand = useMemo(() => commands.deleteYaml(configFilename), [
    configFilename
  ]);

  const downloadHandler = () => {
    var configBlob = new Blob([config], {
      type: "application/x-yaml;charset=utf-8"
    });
    saveAs(configBlob, configFilename);
  };

  return (
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
            {`Use the previously downloaded config YAML or download it again.`}
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
              <ViewConfigDialogBtn filename={configFilename} config={config} />
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
            {`Run this command to remove Prometheus`}
            <br />
            <code>{deleteYamlCommand}</code>
            <CopyToClipboardIcon text={deleteYamlCommand} />
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
            Uninstall this Integration including Dashboards.
            <br />
            <br />
            <UninstallBtn {...props} />
          </Box>
        </TimelineContent>
      </TimelineItem>
    </TimelineWrapper>
  );
};

const section = {
  label: "Uninstall Instructions",
  Component: UninstallInstructions
};
export default section;
