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

import React, { useCallback } from "react";
import { useDispatch } from "react-redux";

import { Integration } from "state/integration/types";
import { makePromtailDashboardRequests } from "./dashboards";

import { useNotificationService } from "client/services/Notification";
import * as grafana from "client/utils/grafana";

import { updateGrafanaStateForIntegration } from "state/integration/actions";

import { Box } from "client/components/Box";
import { Card, CardContent, CardHeader } from "client/components/Card";
import { Button } from "client/components/Button";

import Timeline from "@material-ui/lab/Timeline";
import TimelineItem from "@material-ui/lab/TimelineItem";
import TimelineSeparator from "@material-ui/lab/TimelineSeparator";
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

type ReinstallInstructionsProps = {
  tenant: Tenant;
  integration: Integration;
  isDashboardInstalled: boolean;
};

export const ReinstallInstructions = ({
  integration,
  tenant,
  isDashboardInstalled
}: ReinstallInstructionsProps) => {
  const dispatch = useDispatch();

  const {
    registerNotification,
    unregisterNotification
  } = useNotificationService();

  const notifyError = useCallback(
    (title: string, message: string) => {
      const messageId = Math.floor(Math.random() * Math.floor(100000)).toString();
      const newNotification = {
        id: messageId,
        state: "error" as const,
        title,
        information: message,
        handleClose: () =>
          unregisterNotification({
            id: messageId,
            title: "",
            information: ""
          })
      };
      registerNotification(newNotification);
    },
    [registerNotification, unregisterNotification]
  );

  const dashboardHandler = async () => {
    // Delete existing folder, if any.
    try {
      await grafana.deleteFolder({ integration, tenant });
    } catch (err) {
      // Ignore 404 error - expected for initial dashboard install
      if (err.response.status !== 404) {
        console.log(err);
        notifyError(
          `Could not delete grafana integration dashboard folder ${integration}`,
          err.response.statusText
        );
        return;
      }
    }

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
          title="Reinstall Instructions"
        />
        <CardContent>
          <TimelineWrapper>
            <TimelineItem>
              <TimelineSeparator>
                <TimelineDotWrapper variant="outlined" color="primary">
                  1
                </TimelineDotWrapper>
              </TimelineSeparator>
              <TimelineContent>
                <Box flexGrow={1} pb={2}>
                  Erase and recreate Dashboards for this Integration.
                  <br />
                  <Button
                    variant="contained"
                    size="small"
                    state="primary"
                    disabled={!isDashboardInstalled}
                    onClick={dashboardHandler}
                  >
                    Reinstall Dashboards
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
