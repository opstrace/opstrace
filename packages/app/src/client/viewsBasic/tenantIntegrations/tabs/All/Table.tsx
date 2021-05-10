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
// import { filter, propEq } from "ramda";
import { useHistory } from "react-router-dom";

import {
  IntegrationDefs,
  IntegrationDef
} from "client/viewsBasic/integrations/types";
import { addIntegrationPath } from "client/viewsBasic/integrations/paths";

import { withTenantFromParams, TenantProps } from "client/views/tenant/utils";
import { withSkeleton } from "client/viewsBasic/utils";

import { makeStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";

const useStyles = makeStyles({
  table: {
    minWidth: 650
  }
});

type Props = { data: IntegrationDefs };

export const AllIntegrationsTable = withTenantFromParams<Props>(
  withSkeleton<Props>(({ data, tenant }: Props & TenantProps) => {
    const history = useHistory();
    const classes = useStyles();
    // const available = filter(propEq("enabled", true))(data);

    const onAdd = (i9n: IntegrationDef) => {
      console.log(i9n);
      history.push(
        addIntegrationPath({
          tenant: tenant,
          integration: i9n
        })
      );
    };

    return (
      <TableContainer>
        <Table stickyHeader className={classes.table}>
          <TableHead>
            <TableRow>
              <TableCell>
                <h3>Kind</h3>
              </TableCell>
              <TableCell>
                <h3>Category</h3>
              </TableCell>
              <TableCell>
                <h3>Status</h3>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map(i9n => (
              <TableRow key={i9n.kind}>
                <TableCell component="th" scope="row">
                  {i9n.kind}
                </TableCell>
                <TableCell>{i9n.category}</TableCell>
                <TableCell>
                  {i9n.enabled && (
                    <button onClick={() => onAdd(i9n)}>Add Btn</button>
                  )}
                  {!i9n.enabled && "Comming soon"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  })
);
