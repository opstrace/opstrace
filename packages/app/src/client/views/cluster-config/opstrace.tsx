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

import useOpstraceConfig from "state/opstrace-config/hooks/useOpstraceConfig";

import Loading from "client/components/Loadable/Loading";

import {
  TableContainer,
  Table,
  TableRow,
  TableCell,
  TableBody
} from "@material-ui/core";
import { Card } from "client/components/Card";
import { Typography } from "client/components/Typography";
import { Box } from "client/components/Box";

type FieldType = {
  key: string;
  label: string;
  formatter?: Function;
};

const fields: FieldType[] = [
  { key: "version", label: "Version" },
  { key: "commit", label: "Commit" },
  { key: "branch", label: "Branch" },
  {
    key: "buildTime",
    label: "Build Time",
    formatter: (val: string) => format(parseISO(val), "Pppp")
  },
  { key: "buildHostname", label: "Build Hostname" }
];

const OpstraceConfig = () => {
  const { buildInfo } = useOpstraceConfig();

  if (!buildInfo) return <Loading />;

  return (
    <>
      <Box pt={3} pb={4} display="flex" justifyContent="space-between">
        <Typography variant="h5">Opstrace Build Info</Typography>
      </Box>

      <Box pt={1}>
        <TableContainer component={Card}>
          <Table aria-label="tenants" data-test="tenant/list">
            <TableBody>
              {fields.map(field => (
                <TableRow key={field.key}>
                  <TableCell component="th" scope="row">
                    {field.label}
                  </TableCell>

                  <TableCell>
                    {field.formatter
                      ? //@ts-ignore No index signature with a parameter of type 'string' was found on type 'OpstraceBuildInfo'.
                        field.formatter(buildInfo[field.key])
                      : //@ts-ignore No index signature with a parameter of type 'string' was found on type 'OpstraceBuildInfo'.
                        buildInfo[field.key]}
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

export default OpstraceConfig;
