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

import React, { useCallback } from "react";

import { Tenants, Tenant } from "state/tenant/types";

import { ListItemAvatar } from "@material-ui/core";
import Avatar from "@material-ui/core/Avatar";

import { List, ButtonListItem, ListItemText } from "client/components/List";

export type TenantListProps = {
  selectedIndex: number;
  tenants: Tenants;
  onSelect: (tenant: Tenant, index: number) => void;
};

const avatarStyle = { width: 30, height: 30 };

const TenantList = (props: TenantListProps) => {
  const { selectedIndex, onSelect } = props;

  const renderItem = useCallback(
    ({ data, index }: { data: Tenant; index: number }) => (
      <ButtonListItem
        selected={index === selectedIndex}
        onClick={() => onSelect(data, index)}
        key={data.name}
      >
        <ListItemAvatar>
          <Avatar alt={data.name} style={avatarStyle}>
            {data.name.slice(0, 1).toUpperCase()}
          </Avatar>
        </ListItemAvatar>
        <ListItemText primary={data.name} />
      </ButtonListItem>
    ),
    [selectedIndex, onSelect]
  );

  return (
    <List renderItem={renderItem} items={props.tenants} itemSize={() => 40} />
  );
};

export default React.memo(TenantList);
