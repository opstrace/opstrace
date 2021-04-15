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

import React, { useMemo } from "react";
import { format, parseISO } from "date-fns";
import * as yamlParser from "js-yaml";

// import useGraphana from "client/hooks/useGraphana";
import graphqlClient from "state/clients/graphqlClient";

import { makeStyles } from "@material-ui/core/styles";
import Skeleton from "@material-ui/lab/Skeleton";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";

import Collapse from "@material-ui/core/Collapse";
import IconButton from "@material-ui/core/IconButton";
import Typography from "@material-ui/core/Typography";
import KeyboardArrowDownIcon from "@material-ui/icons/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@material-ui/icons/KeyboardArrowUp";
import Box from "@material-ui/core/Box";

const useStyles = makeStyles({
  table: {
    minWidth: 650
  }
});

type Row = {
  name: string;
  type: string;
  credential: string;
  created_at: string;
  config: string;
};

type ExportersTableProps = {
  tenantId: string;
  rows?: Row[];
  onChange: Function;
};

export const ExportersTable = (props: ExportersTableProps) => {
  const { tenantId, rows, onChange } = props;
  const classes = useStyles();

  if (!rows || rows.length === 0)
    return (
      <Skeleton variant="rect" width="100%" height="100%" animation="wave" />
    );

  const deleteExporter = (name: string) => {
    graphqlClient
      .DeleteExporter({
        tenant: tenantId,
        name: name
      })
      .then(response => {
        onChange();
      });
  };

  return (
    <TableContainer>
      <Table stickyHeader className={classes.table}>
        <TableHead>
          <TableRow>
            <TableCell></TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Credential</TableCell>
            <TableCell>Created At</TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(row => (
            <ExportersRow
              key={row.name}
              tenantId={tenantId}
              row={row}
              onDelete={deleteExporter}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const ExportersRow = (props: {
  tenantId: string;
  row: Row;
  onDelete: (name: string) => void;
}) => {
  const { row, onDelete } = props;
  const [open, setOpen] = React.useState(false);

  // const url = `/loki/ap/ipacgkzv1/series?match=%7Bk8s_container_name%3D%22exporter%22%2Ck8s_namespace_name%3D%22${tenantId}-tenant%22%2Ck8s_pod_name%3D~%22%5Eexporter-${row.name}-%5Ba-z0-9-%5D*%22%7D&start=1618278146119000000&end=1618281746120000000`;

  // const { data: exporterStatus } = useGraphana("terrcin", url);
  // console.log(exporterStatus);

  const config = useMemo(() => {
    if (open)
      return yamlParser.dump(JSON.parse(row.config), {
        schema: yamlParser.JSON_SCHEMA,
        lineWidth: -1
      });
    else return "";
  }, [row.config, open]);

  return (
    <React.Fragment>
      <TableRow>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          {row.name}
        </TableCell>
        <TableCell>{row.type}</TableCell>
        <TableCell>{row.credential}</TableCell>
        <TableCell>{format(parseISO(row.created_at), "Pppp")}</TableCell>
        <TableCell>
          <button type="button" onClick={() => onDelete(row.name)}>
            Delete
          </button>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box margin={1}>
              <Typography variant="subtitle1" gutterBottom component="div">
                {row.type === "cloudwatch" ? "CloudWatch" : "Stackdriver"}{" "}
                Config
              </Typography>
              <pre>{config}</pre>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
};
