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
import { useHistory } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { makeStyles } from "@material-ui/core/styles";

import { Integrations } from "state/integrations/types";
import { showIntegrationPath } from "client/viewsBasic/tenantIntegrations/paths";

import {
  withIntegrationListFromParams,
  IntegrationListProps
} from "client/viewsBasic/tenantIntegrations/utils";
import { withTenantFromParams, TenantProps } from "client/views/tenant/utils";
import { withSkeleton } from "client/viewsBasic/common/utils";

import { Box } from "client/components/Box";
import { Card } from "client/components/Card";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
// Temporary direct import
import IntegrationStatus from "client/viewsBasic/integrationDefs/k8sMetrics/Status";

const useStyles = makeStyles(theme => ({
  integrationRow: {
    cursor: "pointer"
  }
}));

export const InstalledIntegrations = withIntegrationListFromParams(
  ({ integrationList }: IntegrationListProps) => {
    // This integrationList needs to be mapped to integrationDefs (at least to access the Status component, and possibly Edit button)
    return (
      <Box mt={3}>
        <InstalledIntegrationsTable data={integrationList} />
      </Box>
    );
  }
);

type Props = { data: Integrations };

const InstalledIntegrationsTable = withTenantFromParams<Props>(
  withSkeleton<Props>(({ data, tenant }: Props & TenantProps) => {
    const history = useHistory();
    const classes = useStyles();

    return (
      <TableContainer component={Card}>
        <Table aria-label="installed integrations">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created At</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map(i9n => (
              <TableRow
                hover={true}
                className={classes.integrationRow}
                key={i9n.id}
                onClick={() =>
                  history.push(
                    showIntegrationPath({ tenant, integration: i9n })
                  )
                }
              >
                <TableCell component="th" scope="row">
                  {i9n.name}
                </TableCell>
                <TableCell>{i9n.kind}</TableCell>
                <TableCell>
                  <IntegrationStatus integration={i9n} tenant={tenant} />
                </TableCell>
                <TableCell>
                  {format(parseISO(i9n.created_at), "Pppp")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  })
);
