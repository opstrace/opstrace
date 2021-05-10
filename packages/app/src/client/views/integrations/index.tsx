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
import { Tabs } from "client/components/Tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from "@material-ui/core";

const AllIntegrations = () => {
  let integrations = new Array(20).fill(1);

  return (
    <Box mt={3}>
      <Grid container spacing={3}>
        {integrations.map((_, i) => (
          <Grid key={i} item xs={12} sm={6} md={4} lg={3}>
            <Card>
              <CardHeader
                titleTypographyProps={{ variant: "h6" }}
                title={`Integration XXXX #${i}`}
              />
              <CardContent>
                <Typography color="textSecondary">
                  A description of the integration
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

const InstalledIntegrations = () => {
  let rows: { name: string; type: string }[] = [
    { name: "Dummy kubernetes integration", type: "kubernetes logs" }
  ];

  return (
    <Box mt={3}>
      <TableContainer component={Card}>
        <Table aria-label="installed integrations">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => (
              <TableRow key={row.name}>
                <TableCell component="th" scope="row">
                  {row.name}
                </TableCell>
                <TableCell>{row.type}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

const TenantIntegrations = () => {
  const tenant = useSelectedTenant();
  const tenantName = tenant ? tenant.name : "system";
  return (
    <>
      <Box pt={1} pb={4}>
        <Typography variant="h1">Integrations</Typography>
      </Box>
      <Tabs
        tabs={[
          {
            path: `/tenant/${tenantName}/integrations/all`,
            title: "All Integrations",
            component: AllIntegrations
          },
          {
            path: `/tenant/${tenantName}/integrations/installed`,
            title: "Installed Integrations",
            component: InstalledIntegrations
          }
        ]}
      />
    </>
  );
};

export default TenantIntegrations;
