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

import React, { useCallback, useEffect, useState } from "react";
import { findIndex, propEq } from "ramda";

import useTenantList from "state/tenant/hooks/useTenantList";
// import { usePickerService } from "client/services/Picker";

import { Tenant } from "state/tenant/types";
import TenantPicker from "client/views/tenant/TenantPicker";
// import AddTenantDialog from "client/views/tenant/AddTenantDialog";
// import DeleteTenantDialog from "client/views/tenant/DeleteTenantDialog";
import TenantList from "client/views/tenant/TenantList";

type TenantPanelProps = {
  active: boolean;
  defaultId?: string;
  onSelect: (tenant: Tenant, index: number) => void;
};

export const TenantPanel = (props: TenantPanelProps) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  // const { activatePickerWithText } = usePickerService();
  const tenants = useTenantList();

  useEffect(() => {
    if (props.active && props.defaultId) {
      const index = findIndex(propEq("name", props.defaultId))(tenants);
      if (index !== -1) setSelectedIndex(index);
      else if (props.onSelect && tenants[0]) {
        props.onSelect(tenants[0], 0);
      }
    }
  }, [tenants, props.active, props.defaultId]);

  const onSelect = useCallback(
    (tenant: Tenant, index: number) => {
      setSelectedIndex(index);
      if (props.onSelect) props.onSelect(tenant, index);
    },
    [props.onSelect]
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
      <TenantPicker />
      {/* <AddTenantDialog /> */}
      {/* <DeleteTenantDialog /> */}
      <TenantList
        selectedIndex={selectedIndex}
        onSelect={onSelect}
        tenants={tenants}
      />
    </>
  );
};
