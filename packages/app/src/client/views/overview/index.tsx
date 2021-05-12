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

import { Box } from "client/components/Box";
import { Card, CardContent, CardHeader } from "client/components/Card";
import Typography from "client/components/Typography/Typography";
import { useSelectedTenant } from "state/tenant/hooks/useTenant";
import { ExternalLink } from "client/components/Link";
import GrafanaIframe from "client/components/Grafana/Iframe";

const TenantOverview = () => {
  const tenant = useSelectedTenant();

  if (!tenant) {
    return null;
  }

  return (
    <>
      <Box pt={1} pb={4}>
        <Typography variant="h1">Overview</Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardHeader
              titleTypographyProps={{ variant: "h5" }}
              title={`Grafana for ${tenant.name} tenant`}
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography color="textSecondary" variant="body2">
                    View your dashboards and explore logs and metrics for the{" "}
                    <strong>{tenant.name}</strong> tenant.
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box display="flex" justifyContent="flex-end">
                    <ExternalLink
                      href={`${window.location.protocol}//${tenant.name}.${window.location.host}`}
                    >
                      View Grafana →
                    </ExternalLink>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <GrafanaIframe
            initialHeight={1550}
            tenant="system"
            title="Tenant Overview"
            path="/d/c72shqQZz/cortex-overview"
            params={{
              "var-tenant": tenant.name
            }}
          />
        </Grid>
      </Grid>
    </>
  );
};

export default TenantOverview;
