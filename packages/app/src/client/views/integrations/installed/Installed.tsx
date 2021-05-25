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

import {
  integrationDefRecords,
  showIntegrationPath
} from "client/integrations";

import { Box } from "client/components/Box";
import { Card } from "client/components/Card";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import { useSelectedTenantWithFallback } from "state/tenant/hooks/useTenant";
import useIntegrationList from "state/integration/hooks/useIntegration";

const useStyles = makeStyles(theme => ({
  integrationRow: {
    cursor: "pointer"
  }
}));

export const InstalledIntegrations = () => {
  const history = useHistory();
  const classes = useStyles();
  const tenant = useSelectedTenantWithFallback();
  const integrations = useIntegrationList();

  return (
    <Box mt={3}>
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
            {integrations.map(i9n => {
              const i9nDef = integrationDefRecords[i9n.kind];
              return (
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
                  <TableCell>{i9nDef.label}</TableCell>
                  <TableCell>
                    <i9nDef.Status integration={i9n} tenant={tenant} />
                  </TableCell>
                  <TableCell>
                    {format(parseISO(i9n.created_at), "Pppp")}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
