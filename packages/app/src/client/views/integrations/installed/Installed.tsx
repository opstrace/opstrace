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

import { useSelectedTenantWithFallback } from "state/tenant/hooks/useTenant";
import { useIntegrationList } from "state/integration/hooks/useIntegrationList";

import {
  integrationDefRecords,
  showIntegrationPath
} from "client/integrations";

import { makeStyles } from "@material-ui/core/styles";
import { Box } from "client/components/Box";
import { Card } from "client/components/Card";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import { Integration } from "state/integration/types";

const useStyles = makeStyles(theme => ({
  integrationRow: {
    cursor: "pointer"
  },
  logoCell: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap"
  },
  logoText: {
    marginLeft: 10
  }
}));

const IntegrationRow = (props: { integration: Integration }) => {
  const history = useHistory();
  const classes = useStyles();
  const tenant = useSelectedTenantWithFallback();

  const i9nDef = integrationDefRecords[props.integration.kind];

  return (
    <TableRow
      hover
      className={classes.integrationRow}
      key={props.integration.id}
      onClick={() =>
        history.push(
          showIntegrationPath({ tenant, integration: props.integration })
        )
      }
    >
      <TableCell component="th" scope="row">
        {props.integration.name}
      </TableCell>
      <TableCell>
        <div className={classes.logoCell}>
          <img src={i9nDef.Logo} width={15} height={15} alt="" />
          <span className={classes.logoText}> {i9nDef.label}</span>
        </div>
      </TableCell>
      <TableCell>
        <i9nDef.Status integration={props.integration} tenant={tenant} />
      </TableCell>
      <TableCell>
        {format(parseISO(props.integration.created_at), "Pppp")}
      </TableCell>
    </TableRow>
  );
};

export const InstalledIntegrations = () => {
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
            {integrations.map(i9n => (
              <IntegrationRow key={i9n.id} integration={i9n} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
