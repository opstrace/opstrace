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

type Row = {
  id: string;
  name: string;
  kind: string;
  status: number;
  created_at: string;
};

type Props = { rows: Row[] };

export const InstalledIntegrationsTable = withSkeleton<Props>(
  ({ rows }: Props) => {
    const classes = useStyles();

    return (
      <TableContainer>
        <Table stickyHeader className={classes.table}>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Kind</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Used</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => (
              <TableRow key={row.id}>
                <TableCell component="th" scope="row">
                  {row.name}
                </TableCell>
                <TableCell>{row.kind}</TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell>
                  {format(parseISO(row.created_at), "Pppp")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }
);
