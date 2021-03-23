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

import { Users, User } from "state/user/types";

import { ListItemAvatar } from "@material-ui/core";
import Avatar from "@material-ui/core/Avatar";

import { List, ButtonListItem, ListItemText } from "client/components/List";

export type UserListProps = {
  selectedIndex: number;
  users: Users;
  onSelect: (user: User, index: number) => void;
};

const avatarStyle = { width: 30, height: 30 };

const UserList = (props: UserListProps) => {
  const { selectedIndex, onSelect } = props;

  const renderItem = useCallback(
    ({ data, index }: { data: User; index: number }) => (
      <ButtonListItem
        selected={index === selectedIndex}
        onClick={() => onSelect(data, index)}
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
    [selectedIndex, onSelect]
  );

  return (
    <List renderItem={renderItem} items={props.users} itemSize={() => 40} />
  );
};

export default React.memo(UserList);
