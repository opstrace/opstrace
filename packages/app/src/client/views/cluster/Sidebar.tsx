/**
 * Copyright 2019-2021 Opstrace, Inc.
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

import React, { useCallback, useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import IconButton from "@material-ui/core/IconButton";
import AddIcon from "@material-ui/icons/Add";
import useUserList from "state/user/hooks/useUserList";
import useTenantList from "state/tenant/hooks/useTenantList";

import { usePickerService } from "client/services/Picker";
import { SideBar, SideBarContainer } from "client/components/SideBar";
import { User } from "state/user/types";
import { Tenant } from "state/tenant/types";
import UserPicker from "./UserPicker";
import AddUserDialog from "./AddUserDialog";
import DeleteUserDialog from "./DeleteUserDialog";
import TenantPicker from "./TenantPicker";
import AddTenantDialog from "./AddTenantDialog";
import DeleteTenantDialog from "./DeleteTenantDialog";
import UserList from "./UserList";
import TenantList from "./TenantList";

const ClusterSidebar = () => {
  const [selectedUserIndex, setSelectedUserIndex] = useState<number>(-1);
  const [selectedTenantIndex, setSelectedTenantIndex] = useState<number>(-1);
  const params = useParams<{ id?: string; tenant?: string }>();
  const { activatePickerWithText } = usePickerService();
  const users = useUserList();
  const tenants = useTenantList();
  const history = useHistory();

  useEffect(() => {
    const idx = users.findIndex(u => u.opaque_id === params.id);
    if (idx > -1) {
      setSelectedUserIndex(idx);
      setSelectedTenantIndex(-1);
    }

    const tidx = tenants.findIndex(t => t.name === params.tenant);
    if (tidx > -1) {
      setSelectedUserIndex(-1);
      setSelectedTenantIndex(tidx);
    }
    // handle case where the id is invalid
    if (params.id && idx < 0 && users.length) {
      // navigate to first user in the list by default
      history.push(`/cluster/users/${users[0].opaque_id}`);
    }
    // handle case where the tenant is invalid
    if (params.tenant && tidx < 0 && tenants.length) {
      // navigate to system tenant by default
      history.push(`/cluster/tenants/system`);
    }
  }, [users, tenants, params.id, params.tenant, history]);

  const addUser = useCallback(() => {
    activatePickerWithText("add user: ");
  }, [activatePickerWithText]);

  const addTenant = useCallback(() => {
    activatePickerWithText("add tenant: ");
  }, [activatePickerWithText]);

  const onUserSelect = useCallback(
    (selected: User) => {
      history.push(`/cluster/users/${selected.opaque_id}`);
    },
    [history]
  );
  const onTenantSelect = useCallback(
    (selected: Tenant) => {
      history.push(`/cluster/tenants/${selected.name}`);
    },
    [history]
  );

  const userActions = (
    <IconButton size="small" onClick={addUser}>
      <AddIcon />
    </IconButton>
  );
  const tenantActions = (
    <IconButton size="small" onClick={addTenant}>
      <AddIcon />
    </IconButton>
  );

  return (
    <>
      <UserPicker />
      <AddUserDialog />
      <DeleteUserDialog />
      <TenantPicker />
      <AddTenantDialog />
      <DeleteTenantDialog />
      <SideBar>
        <SideBarContainer
          title="Tenants"
          minHeight={100}
          flexGrow={1}
          actions={tenantActions}
        >
          <TenantList
            selectedTenantIndex={selectedTenantIndex}
            onSelect={onTenantSelect}
            tenants={tenants}
          />
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
