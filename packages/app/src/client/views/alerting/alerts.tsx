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

import { useSelectedTenant } from "state/tenant/hooks/useTenant";
import { grafanaUrl } from "client/viewsBasic/paths";

import Grid from "@material-ui/core/Grid";
import { Box } from "client/components/Box";
import { Card, CardContent, CardHeader } from "client/components/Card";
import { Typography } from "client/components/Typography";
import { ExternalLink } from "client/components/Link";

const Alerts = () => {
  const tenant = useSelectedTenant();
  const tenantName = tenant ? tenant.name : "system";

  return (
    <Box mt={3}>
      <Card>
        <CardHeader
          titleTypographyProps={{ variant: "h6" }}
          title="View Alerts"
        />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography color="textSecondary" variant="body2">
                View alerts for the <strong>{tenantName}</strong> tenant in the
                Prometheus UI. Full support for viewing, editing and creating
                alerts in this UI is under construction.{" "}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box display="flex" justifyContent="flex-end">
                <ExternalLink
                  href={`${grafanaUrl({
                    tenant: tenantName
                  })}/prometheus/alerts`}
                >
                  View Alerts →
                </ExternalLink>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Alerts;
