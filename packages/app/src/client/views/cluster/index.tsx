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
import Skeleton from "@material-ui/lab/Skeleton";
import Avatar from "@material-ui/core/Avatar";
import { useDispatch } from "react-redux";

import { Box } from "client/components/Box";
import { deleteUser } from "state/user/actions";
import { deleteTenant } from "state/tenant/actions";

import useUserList from "state/user/hooks/useUserList";
import Layout from "client/layout/MainContent";
import Typography from "client/components/Typography/Typography";
import SideBar from "./Sidebar";

import { Card, CardContent, CardHeader } from "client/components/Card";
import { Button } from "client/components/Button";
import { usePickerService } from "client/services/Picker";
import { useCommandService } from "client/services/Command";
import useCurrentUser from "state/user/hooks/useCurrentUser";
import useTenantList from "state/tenant/hooks/useTenantList";
import { ExternalLink } from "client/components/Link";

const AttributeKey = (props: { children: React.ReactNode }) => (
  <Box pt={2} pb={2}>
    <Typography variant="h6" color="textSecondary">
      {props.children}
    </Typography>
  </Box>
);
const AttributeValue = (props: { children: React.ReactNode }) => (
  <Box p={3} pt={2} pb={2}>
    <Typography variant="h6">{props.children}</Typography>
  </Box>
);

const Cluster = () => {
  const params = useParams<{ id?: string; tenant?: string }>();
  const users = useUserList();
  const tenants = useTenantList();
  const currentUser = useCurrentUser();
  const dispatch = useDispatch();

  const selectedUser = useMemo(
    () => users.find(u => u.opaque_id === params.id),
    [params.id, users]
  );
  const selectedTenant = useMemo(
    () => tenants.find(t => t.name === params.tenant),
    [params.tenant, tenants]
  );

  const { activatePickerWithText } = usePickerService(
    {
      title: `Delete ${selectedUser?.email}?`,
      activationPrefix: "delete user directly?:",
      disableFilter: true,
      disableInput: true,
      options: [
        {
          id: "yes",
          text: `yes`
        },
        {
          id: "no",
          text: "no"
        }
      ],
      onSelected: option => {
        if (option.id === "yes" && selectedUser?.email) {
          dispatch(deleteUser(selectedUser?.email));
        }
      }
    },
    [selectedUser?.email]
  );
  usePickerService(
    {
      title: `Delete ${selectedTenant?.name}?`,
      activationPrefix: "delete tenant directly?:",
      disableFilter: true,
      disableInput: true,
      options: [
        {
          id: "yes",
          text: `yes`
        },
        {
          id: "no",
          text: "no"
        }
      ],
      onSelected: option => {
        if (option.id === "yes" && selectedTenant?.name) {
          dispatch(deleteTenant(selectedTenant?.name));
        }
      }
    },
    [selectedTenant?.name]
  );

  const cmdService = useCommandService();

  const getContent = () => {
    if (selectedUser) {
      return (
        <Box
          width="100%"
          height="100%"
          display="flex"
          justifyContent="center"
          alignItems="center"
          flexWrap="wrap"
          p={1}
        >
          <Box maxWidth={700}>
            <Card p={3}>
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
                      <Button
                        variant="outlined"
                        size="medium"
                        disabled={users.length < 2}
                        onClick={() =>
                          activatePickerWithText("delete user directly?: ")
                        }
                      >
                        Delete
                      </Button>
                    </Box>
                  </Box>
                }
                title={selectedUser.username}
              />
              <CardContent>
                <Box display="flex">
                  <Box display="flex" flexDirection="column">
                    <AttributeKey>Role:</AttributeKey>
                    <AttributeKey>Username:</AttributeKey>
                    <AttributeKey>Email:</AttributeKey>
                    <AttributeKey>Last Login:</AttributeKey>
                    <AttributeKey>Created:</AttributeKey>
                  </Box>
                  <Box display="flex" flexDirection="column" flexGrow={1}>
                    <AttributeValue>{selectedUser.role}</AttributeValue>
                    <AttributeValue>{selectedUser.username}</AttributeValue>
                    <AttributeValue>{selectedUser.email}</AttributeValue>
                    <AttributeValue>
                      {selectedUser.session_last_updated
                        ? selectedUser.session_last_updated
                        : "-"}
                    </AttributeValue>
                    <AttributeValue>{selectedUser.created_at}</AttributeValue>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      );
    }

    if (selectedTenant) {
      return (
        <Box
          width="100%"
          height="100%"
          display="flex"
          justifyContent="center"
          alignItems="center"
          flexWrap="wrap"
          p={1}
        >
          <Box maxWidth={700}>
            <Card p={3}>
              <CardHeader
                titleTypographyProps={{ variant: "h5" }}
                action={
                  <Box ml={3} display="flex" flexWrap="wrap">
                    <Box p={1}>
                      <Button
                        variant="outlined"
                        size="medium"
                        disabled={selectedTenant.type === "SYSTEM"}
                        onClick={() =>
                          activatePickerWithText("delete tenant directly?: ")
                        }
                      >
                        Delete
                      </Button>
                    </Box>
                  </Box>
                }
                title={selectedTenant.name}
              />
              <CardContent>
                <Box display="flex">
                  <Box display="flex" flexDirection="column">
                    <AttributeKey>Grafana:</AttributeKey>
                    <AttributeKey>Created:</AttributeKey>
                  </Box>
                  <Box display="flex" flexDirection="column" flexGrow={1}>
                    <AttributeValue>
                      <ExternalLink
                        href={`${window.location.protocol}//${selectedTenant.name}.${window.location.host}`}
                      >
                        {`${selectedTenant.name}.${window.location.host}`}
                      </ExternalLink>
                    </AttributeValue>
                    <AttributeValue>{selectedTenant.created_at}</AttributeValue>
                  </Box>
                </Box>
              </CardContent>
            </Card>
            <Typography color="textSecondary">
              New tenants can take 5 minutes to provision with dns propagation
            </Typography>
          </Box>
        </Box>
      );
    }

    return (
      <Skeleton variant="rect" width="100%" height="100%" animation="wave" />
    );
  };

  const content = getContent();

  return <Layout sidebar={SideBar}>{content}</Layout>;
};

export default Cluster;
