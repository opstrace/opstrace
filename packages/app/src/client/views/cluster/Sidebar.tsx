import React, { useCallback, useEffect, useState } from "react";
import { ListItemAvatar } from "@material-ui/core";
import { useHistory, useParams } from "react-router-dom";
import Avatar from "@material-ui/core/Avatar";
import IconButton from "@material-ui/core/IconButton";
import AddIcon from "@material-ui/icons/Add";
import useUserList from "state/user/hooks/useUserList";

import { Box } from "client/components/Box";
import { SideBar, SideBarContainer } from "client/components/SideBar";
import { List, ButtonListItem, ListItemText } from "client/components/List";
import { Users, User } from "state/user/types";
import UserPicker from "./UserPicker";
import AddUserDialog from "./AddUserDialog";
import { usePickerService } from "client/services/Picker";
import DeleteUserDialog from "./DeleteUserDialog";

export type UserListProps = {
  selectedUserIndex: number;
  users: Users;
  onSelect: (selectedOption: User) => void;
};

const avatarStyle = { width: 30, height: 30 };

const UserList = (props: UserListProps) => {
  const { selectedUserIndex, onSelect } = props;

  const renderItem = useCallback(
    ({ data, index }: { data: User; index: number }) => (
      <ButtonListItem
        selected={index === selectedUserIndex}
        onClick={() => onSelect(data)}
        key={data.email}
      >
        <ListItemAvatar>
          {data.avatar ? (
            <Avatar alt={data.username} style={avatarStyle} src={data.avatar} />
          ) : (
            <Avatar alt={data.username} style={avatarStyle}>
              {data.username.slice(0, 1).toUpperCase()}
            </Avatar>
          )}
        </ListItemAvatar>
        <ListItemText primary={data.email} />
      </ButtonListItem>
    ),
    [selectedUserIndex, onSelect]
  );

  return (
    <List renderItem={renderItem} items={props.users} itemSize={() => 40} />
  );
};

const ClusterSidebar = () => {
  const [selectedUserIndex, setSelectedUserIndex] = useState<number>(-1);
  const params = useParams<{ email?: string; tenant?: string }>();
  const { activatePickerWithText } = usePickerService();
  const users = useUserList();
  const history = useHistory();

  useEffect(() => {
    const idx = users.findIndex(u => u.email === params.email);
    if (idx > -1) {
      setSelectedUserIndex(idx);
    }
    // handle case where the email is invalid
    if (params.email && idx < 0 && users.length) {
      // navigate to first user in the list by default
      history.push(`/cluster/users/${users[0].email}`);
    }
  }, [users, params.email, history]);

  const addUser = useCallback(() => {
    activatePickerWithText("add user: ");
  }, [activatePickerWithText]);

  const onUserSelect = useCallback(
    (selected: User) => {
      history.push(`/cluster/users/${selected.email}`);
    },
    [history]
  );

  const userActions = (
    <IconButton size="small" onClick={addUser}>
      <AddIcon />
    </IconButton>
  );

  return (
    <>
      <UserPicker />
      <AddUserDialog />
      <DeleteUserDialog />
      <SideBar>
        <SideBarContainer title="Tenants" minHeight={100}>
          <Box p={1}>placeholder</Box>
        </SideBarContainer>
        <SideBarContainer title="Users" flexGrow={1} actions={userActions}>
          <UserList
            selectedUserIndex={selectedUserIndex}
            onSelect={onUserSelect}
            users={users}
          />
        </SideBarContainer>
      </SideBar>
    </>
  );
};

export default ClusterSidebar;
