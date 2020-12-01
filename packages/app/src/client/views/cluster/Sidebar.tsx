import React, { useCallback, useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import IconButton from "@material-ui/core/IconButton";
import AddIcon from "@material-ui/icons/Add";
import useUserList from "state/user/hooks/useUserList";

import { Box } from "client/components/Box";
import { SideBar, SideBarContainer } from "client/components/SideBar";
import { User } from "state/user/types";
import UserPicker from "./UserPicker";
import AddUserDialog from "./AddUserDialog";
import { usePickerService } from "client/services/Picker";
import DeleteUserDialog from "./DeleteUserDialog";
import UserList from "./UserList";

const ClusterSidebar = () => {
  const [selectedUserIndex, setSelectedUserIndex] = useState<number>(-1);
  const params = useParams<{ id?: string; tenant?: string }>();
  const { activatePickerWithText } = usePickerService();
  const users = useUserList();
  const history = useHistory();

  useEffect(() => {
    const idx = users.findIndex(u => u.opaque_id === params.id);
    if (idx > -1) {
      setSelectedUserIndex(idx);
    }
    // handle case where the email is invalid
    if (params.id && idx < 0 && users.length) {
      // navigate to first user in the list by default
      history.push(`/cluster/users/${users[0].opaque_id}`);
    }
  }, [users, params.id, history]);

  const addUser = useCallback(() => {
    activatePickerWithText("add user: ");
  }, [activatePickerWithText]);

  const onUserSelect = useCallback(
    (selected: User) => {
      history.push(`/cluster/users/${selected.opaque_id}`);
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
        <SideBarContainer title="Tenants" minHeight={100} flexGrow={1}>
          <Box p={1}>placeholder</Box>
        </SideBarContainer>
        <SideBarContainer title="Users" flexGrow={3} actions={userActions}>
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
