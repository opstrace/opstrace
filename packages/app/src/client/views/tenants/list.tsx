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
import { format, parseISO } from "date-fns";
import { useHistory } from "react-router";

import { Box } from "client/components/Box";
import { Card } from "client/components/Card";
import Typography from "client/components/Typography/Typography";

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import DeleteTenantButton from "./deleteTenant";
import AddTenantDialog from "./AddTenantDialog";
import DeleteTenantDialog from "./DeleteTenantDialog";
import { Button } from "client/components/Button";
import { useCommandService } from "client/services/Command";
import { addTenantCommandId } from "./AddTenantDialog";
import useTenantList from "state/tenant/hooks/useTenantList";

const useStyles = makeStyles(theme => ({
  tenantRow: {
    cursor: "pointer"
  }
}));

const Tenants = () => {
  const tenants = useTenantList();
  const history = useHistory();
  const classes = useStyles();
  const cmdService = useCommandService();

  return (
    <>
      <AddTenantDialog />
      <DeleteTenantDialog />
      <Box pt={1} pb={4} display="flex" justifyContent="space-between">
        <Typography variant="h1">Tenants</Typography>
        <Button
          variant="contained"
          state="primary"
          size="medium"
          onClick={() => cmdService.executeCommand(addTenantCommandId)}
        >
          Add Tenant
        </Button>
      </Box>
      <Box>
        <TableContainer component={Card}>
          <Table aria-label="tenants">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>type</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tenants.map(tenant => (
                <TableRow
                  hover={true}
                  className={classes.tenantRow}
                  key={tenant.name}
                  onClick={() => history.push(`/tenant/${tenant.name}`)}
                >
                  <TableCell component="th" scope="row">
                    {tenant.name}
                  </TableCell>
                  <TableCell>{tenant.type}</TableCell>
                  <TableCell>
                    {tenant.created_at
                      ? format(parseISO(tenant.created_at), "Pppp")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <DeleteTenantButton tenant={tenant} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </>
  );
};

export default Tenants;
