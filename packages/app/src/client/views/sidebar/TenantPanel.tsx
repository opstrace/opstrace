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
  const { active, defaultId, onSelect } = props;
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const tenants = useTenantList();

  useEffect(() => {
    if (active && defaultId) {
      const index = findIndex(propEq("name", defaultId))(tenants);
      if (index !== -1) setSelectedIndex(index);
      else if (onSelect && tenants[0]) {
        onSelect(tenants[0], 0);
      }
    }
  }, [tenants, onSelect, active, defaultId]);

  const selectCallback = useCallback(
    (tenant: Tenant, index: number) => {
      setSelectedIndex(index);
      if (onSelect) onSelect(tenant, index);
    },
    [onSelect]
  );

  return (
    <>
      <TenantPicker />
      {/* <AddTenantDialog /> */}
      {/* <DeleteTenantDialog /> */}
      <TenantList
        selectedIndex={selectedIndex}
        onSelect={selectCallback}
        tenants={tenants}
      />
    </>
  );
};
