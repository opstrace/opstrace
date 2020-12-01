import React, { useCallback } from "react";
import { ListItemAvatar } from "@material-ui/core";
import Avatar from "@material-ui/core/Avatar";
import styled from "styled-components";

import { List, ListItem, ListItemText } from "client/components/List";
import { Tenants, Tenant } from "state/tenant/types";

const StyledListItem = styled(ListItem)`
  cursor: pointer;
`;

export type TenantListProps = {
  selectedTenantIndex: number;
  tenants: Tenants;
  onSelect: (selectedOption: Tenant) => void;
};

const avatarStyle = { width: 30, height: 30 };

const TenantList = (props: TenantListProps) => {
  const { selectedTenantIndex, onSelect } = props;

  const renderItem = useCallback(
    ({ data, index }: { data: Tenant; index: number }) => (
      <StyledListItem
        selected={index === selectedTenantIndex}
        onClick={() => onSelect(data)}
        key={data.name}
      >
        <ListItemAvatar>
          <Avatar alt={data.name} style={avatarStyle}>
            {data.name.slice(0, 1).toUpperCase()}
          </Avatar>
        </ListItemAvatar>
        <ListItemText primary={data.name} />
      </StyledListItem>
    ),
    [selectedTenantIndex, onSelect]
  );

  return (
    <List renderItem={renderItem} items={props.tenants} itemSize={() => 40} />
  );
};

export default TenantList;
