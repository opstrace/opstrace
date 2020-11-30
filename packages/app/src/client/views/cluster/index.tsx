import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Skeleton from "@material-ui/lab/Skeleton";
import Avatar from "@material-ui/core/Avatar";

import { Box } from "client/components/Box";
import { deleteUser } from "state/user/actions";
import { User } from "state/user/types";

import useUserList from "state/user/hooks/useUserList";
import Layout from "client/layout/MainContent";
import Typography from "client/components/Typography/Typography";
import SideBar from "./Sidebar";

import { Card, CardContent, CardHeader } from "client/components/Card";
import { Button } from "client/components/Button";
import { usePickerService } from "client/services/Picker";
import { useDispatch } from "react-redux";

const AttributeKey = (props: { children: React.ReactNode }) => (
  <Box p={3} pt={2} pb={2}>
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
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const params = useParams<{ email?: string; tenant?: string }>();
  const users = useUserList();
  const dispatch = useDispatch();

  useEffect(() => {
    const user = users.find(u => u.email === params.email);
    if (user) {
      setSelectedUser(user);
    }
  }, [users, params.email]);

  const { activatePickerWithText } = usePickerService(
    {
      title: `Delete ${params.email}?`,
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
        if (option.id === "yes" && params.email) {
          dispatch(deleteUser(params.email));
        }
      }
    },
    [params.email]
  );

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
                  <Box ml={3}>
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
                    <AttributeKey>Created At:</AttributeKey>
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

    return (
      <Skeleton variant="rect" width="100%" height="100%" animation="wave" />
    );
  };

  return <Layout sidebar={SideBar}>{getContent()}</Layout>;
};

export default Cluster;
