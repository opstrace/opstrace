/**
 * Copyright 2020 Opstrace, Inc.
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
import { useParams } from "react-router-dom";

import { useCommandService } from "client/services/Command";
import useCurrentUser from "state/user/hooks/useCurrentUser";
import useUserList from "state/user/hooks/useUserList";

import Skeleton from "@material-ui/lab/Skeleton";
import Avatar from "@material-ui/core/Avatar";

import { Card, CardContent, CardHeader } from "client/components/Card";
import { Button } from "client/components/Button";
import { Box } from "client/components/Box";
import Attribute from "client/components/Attribute";
import DeleteUserButton from "./deleteUser";
import DeleteUserDialog from "./DeleteUserDialog";

const UserDetail = () => {
  const params = useParams<{ userId: string }>();
  const users = useUserList();
  const currentUser = useCurrentUser();

  const selectedUser = useMemo(() => users.find(u => u.id === params.userId), [
    params.userId,
    users
  ]);

  const cmdService = useCommandService();

  if (!selectedUser)
    return (
      <Skeleton variant="rect" width="100%" height="100%" animation="wave" />
    );
  else
    return (
      <>
        <DeleteUserDialog />
        <Box
          width="100%"
          height="100%"
          display="flex"
          justifyContent="center"
          alignItems="center"
          flexWrap="wrap"
          p={1}
        >
          <Card>
            <CardHeader
              titleTypographyProps={{ variant: "h5" }}
              avatar={
                selectedUser.avatar ? (
                  <Avatar
                    alt={selectedUser.username}
                    style={{ width: 100, height: 100 }}
                    src={selectedUser.avatar}
                  />
                ) : (
                  <Avatar
                    alt={selectedUser.username}
                    style={{ width: 100, height: 100 }}
                  >
                    {selectedUser.username.slice(0, 1).toUpperCase()}
                  </Avatar>
                )
              }
              action={
                <Box ml={3} display="flex" flexWrap="wrap">
                  {selectedUser.email === currentUser?.email ? (
                    <Box p={1}>
                      <Button
                        variant="outlined"
                        size="medium"
                        onClick={() => cmdService.executeCommand("logout")}
                      >
                        Logout
                      </Button>
                    </Box>
                  ) : null}
                  <Box p={1}>
                    <DeleteUserButton user={selectedUser} />
                  </Box>
                </Box>
              }
              title={selectedUser.username}
            />
            <CardContent>
              <Box display="flex">
                <Box display="flex" flexDirection="column">
                  <Attribute.Key>Role:</Attribute.Key>
                  <Attribute.Key>Username:</Attribute.Key>
                  <Attribute.Key>Email:</Attribute.Key>
                  <Attribute.Key>Last Login:</Attribute.Key>
                  <Attribute.Key>Created:</Attribute.Key>
                </Box>
                <Box display="flex" flexDirection="column" flexGrow={1}>
                  <Attribute.Value>{selectedUser.role}</Attribute.Value>
                  <Attribute.Value>{selectedUser.username}</Attribute.Value>
                  <Attribute.Value>{selectedUser.email}</Attribute.Value>
                  <Attribute.Value>
                    {selectedUser.session_last_updated
                      ? selectedUser.session_last_updated
                      : "-"}
                  </Attribute.Value>
                  <Attribute.Value>{selectedUser.created_at}</Attribute.Value>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </>
    );
};

export default UserDetail;
