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
import Grid from "@material-ui/core/Grid";

import { grafanaUrl } from "client/utils/grafana";

import { Box } from "client/components/Box";
import { Card, CardContent, CardHeader } from "client/components/Card";
import Typography from "client/components/Typography/Typography";
import { useSelectedTenantWithFallback } from "state/tenant/hooks/useTenant";
import { ExternalLink } from "client/components/Link";

const TenantAlerting = () => {
  const tenant = useSelectedTenantWithFallback();

  return (
    <>
      <Box pt={1} pb={4}>
        <Typography variant="h1">Alerting</Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardHeader
              titleTypographyProps={{ variant: "h5" }}
              title={`View & Manage Alerts`}
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography color="textSecondary" variant="body2">
                    View and manage alerts for the{" "}
                    <strong>{tenant.name}</strong> tenant.
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box display="flex" justifyContent="flex-end">
                    <ExternalLink
                      href={`${grafanaUrl({
                        tenant
                      })}/grafana/alerting/list`}
                    >
                      Alerts →
                    </ExternalLink>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardHeader
              titleTypographyProps={{ variant: "h5" }}
              title={`Manage Silences`}
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography color="textSecondary" variant="body2">
                    Manage alert silences for the <strong>{tenant.name}</strong>{" "}
                    tenant.
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box display="flex" justifyContent="flex-end">
                    <ExternalLink
                      href={`${grafanaUrl({
                        tenant
                      })}/grafana/alerting/silences?alertmanager=alertmanager`}
                    >
                      Manage silences →
                    </ExternalLink>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardHeader
              titleTypographyProps={{ variant: "h5" }}
              title={`Manage Contact Points`}
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography color="textSecondary" variant="body2">
                    Manage contact points for the <strong>{tenant.name}</strong>{" "}
                    tenant.
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box display="flex" justifyContent="flex-end">
                    <ExternalLink
                      href={`${grafanaUrl({
                        tenant
                      })}/grafana/alerting/notifications?alertmanager=alertmanager`}
                    >
                      Manage contact points →
                    </ExternalLink>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardHeader
              titleTypographyProps={{ variant: "h5" }}
              title={`Manage Notification Policies`}
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography color="textSecondary" variant="body2">
                    Manage notification policies for the{" "}
                    <strong>{tenant.name}</strong> tenant.
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box display="flex" justifyContent="flex-end">
                    <ExternalLink
                      href={`${grafanaUrl({
                        tenant
                      })}/grafana/alerting/routes?alertmanager=alertmanager`}
                    >
                      Manage notification policies →
                    </ExternalLink>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
};

export default TenantAlerting;
