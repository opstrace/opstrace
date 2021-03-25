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

import React, { useCallback, useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { findIndex, propEq } from "ramda";

import useTenantList from "state/tenant/hooks/useTenantList";

import { Tenant, Tenants } from "state/tenant/types";
import { tenantsToItems } from "client/views/tenant/utils";

import { Panel, PanelItem } from "client/components/Panel";

import TenantPicker from "client/views/tenant/TenantPicker";
// import AddTenantDialog from "client/views/tenant/AddTenantDialog";
// import DeleteTenantDialog from "client/views/tenant/DeleteTenantDialog";

type TenantPanelProps = {
  defaultId?: string;
};

export const TenantPanel = (props: TenantPanelProps) => {
  const { defaultId } = props;
  const [selectedIndex, setSelectedIndex] = useState<number>();
  const tenants = useTenantList();
  const history = useHistory();

  useEffect(() => {
    if (defaultId) {
      const newIndex = findIndex(propEq("name", defaultId))(tenants);
      setSelectedIndex(newIndex);
      if (newIndex === -1 && tenants[0]) {
        history.push(`/cluster/tenants/${tenants[0].name}`);
      }
    }
  }, [tenants, defaultId]);

  const selectCallback = useCallback(
    (
      item: PanelItem,
      index: number,
      subItem?: PanelItem,
      subItemIndex?: number
    ) => {
      setSelectedIndex(index);
      console.log("subItem click", subItem, subItemIndex);
      if (subItem && subItem.id !== "detail")
        history.push(`/cluster/tenants/${item.data.name}/${subItem.id}`);
      else history.push(`/cluster/tenants/${item.data.name}`);
    },
    [history]
  );

  const makeSubItems = (item: PanelItem, index: number) => {
    return [
      { id: "detail", text: "Detail", data: {} },
      { id: "alertmanager-config", text: "Alertmanager", data: {} }
    ];
  };

  return (
    <>
      <TenantPicker />
      {/* <AddTenantDialog /> */}
      {/* <DeleteTenantDialog /> */}
      <Panel
        forceSelected={selectedIndex}
        items={tenantsToItems(tenants)}
        onSelect={selectCallback}
        makeSubItems={makeSubItems}
      />
    </>
  );
};

export type TenantListProps = {
  selectedIndex: number;
  tenants: Tenants;
  onSelect: (tenant: Tenant, index: number) => void;
};
