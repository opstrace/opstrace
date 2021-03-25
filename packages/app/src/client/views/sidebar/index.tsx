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

import React, { useCallback, useState } from "react";
import { useHistory, useParams } from "react-router-dom";

import IconButton from "@material-ui/core/IconButton";
import AddIcon from "@material-ui/icons/Add";

import { usePickerService } from "client/services/Picker";
import { SideBar, SideBarContainer } from "client/components/SideBar";
import { User } from "state/user/types";
import { Tenant } from "state/tenant/types";

import { TenantPanel } from "./TenantPanel";
import { UserPanel } from "./UserPanel";

const ClusterSidebar = () => {
  const params = useParams<{ id?: string; tenant?: string }>();
  const [activePanel, setActivePanel] = useState<string>(
    params.id ? "user" : "tenant"
  );
  const { activatePickerWithText } = usePickerService();
  const history = useHistory();

  const onUserSelect = useCallback(
    (user: User) => {
      setActivePanel("user");
      history.push(`/cluster/users/${user.id}`);
    },
    [history]
  );
  const onTenantSelect = useCallback(
    (tenant: Tenant, index) => {
      setActivePanel("tenant");
      history.push(`/cluster/tenants/${tenant.name}`);
    },
    [history]
  );

  const addUser = useCallback(() => {
    activatePickerWithText("add user: ");
  }, [activatePickerWithText]);

  const userActions = (
    <IconButton size="small" onClick={addUser}>
      <AddIcon />
    </IconButton>
  );

  // const addTenant = useCallback(() => {
  //   activatePickerWithText("add tenant: ");
  // }, [activatePickerWithText]);

  // const tenantActions = (
  //   <IconButton size="small" onClick={addTenant}>
  //     <AddIcon />
  //   </IconButton>
  // );

  return (
    <>
      <SideBar>
        <SideBarContainer
          title="Tenants"
          minHeight={100}
          flexGrow={1}
          // actions={tenantActions}
        >
          <TenantPanel
            defaultId={activePanel === "tenant" ? params.tenant : undefined}
            onSelect={onTenantSelect}
          />
        </SideBarContainer>
        <SideBarContainer title="Users" flexGrow={3} actions={userActions}>
          <UserPanel
            active={activePanel === "user"}
            defaultId={params.id}
            onSelect={onUserSelect}
          />
        </SideBarContainer>
      </SideBar>
    </>
  );
};

export default ClusterSidebar;
