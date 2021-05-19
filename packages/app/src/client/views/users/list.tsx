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
import { useSelectedTenant } from "state/tenant/hooks/useTenant";

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import useUserList from "state/user/hooks/useUserList";
import DeleteUserButton from "./deleteUser";
import UserPicker from "../user/UserPicker";
import AddUserDialog from "../user/AddUserDialog";
import DeleteUserDialog from "../user/DeleteUserDialog";
import { Button } from "client/components/Button";
import { useCommandService } from "client/services/Command";
import { addUserCommandId } from "./AddUserDialog";

const useStyles = makeStyles(theme => ({
  userRow: {
    cursor: "pointer"
  }
}));

const Users = () => {
  const tenant = useSelectedTenant();
  const users = useUserList();
  const clusterUserList = typeof tenant === "undefined";
  const history = useHistory();
  const classes = useStyles();
  const cmdService = useCommandService();

  return (
    <>
      <UserPicker />
      <AddUserDialog />
      <DeleteUserDialog />
      <Box pt={1} pb={4} display="flex" justifyContent="space-between">
        <Typography variant="h1">
          {clusterUserList ? `All Cluster Users` : `Tenant Users`}
        </Typography>
        <Button
          variant="contained"
          state="primary"
          size="medium"
          onClick={() => cmdService.executeCommand(addUserCommandId)}
        >
          Add User
        </Button>
      </Box>
      <Box>
        <TableContainer component={Card}>
          <Table aria-label="users">
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Last Login</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map(user => (
                <TableRow
                  className={classes.userRow}
                  key={user.email}
                  hover={true}
                  onClick={() =>
                    history.push(
                      clusterUserList
                        ? `/cluster/users/${user.id}`
                        : `/tenant/${tenant?.name}/users/${user.id}`
                    )
                  }
                >
                  <TableCell component="th" scope="row">
                    {user.username}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                    {format(parseISO(user.created_at), "Pppp")}
                  </TableCell>
                  <TableCell>
                    {user.session_last_updated
                      ? format(parseISO(user.session_last_updated), "Pppp")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <DeleteUserButton user={user} />
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

export default Users;
