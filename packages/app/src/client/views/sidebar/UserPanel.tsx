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

import useUserList from "state/user/hooks/useUserList";

import { User } from "state/user/types";

import UserPicker from "client/views/user/UserPicker";
import AddUserDialog from "client/views/user/AddUserDialog";
import DeleteUserDialog from "client/views/user/DeleteUserDialog";

import UserList from "client/views/user/UserList";

type UserPanelProps = {
  active: boolean;
  defaultId?: string;
  onSelect: (user: User, index: number) => void;
};

export const UserPanel = (props: UserPanelProps) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const users = useUserList();

  useEffect(() => {
    if (props.active && props.defaultId) {
      const index = findIndex(propEq("id", props.defaultId))(users);
      if (index !== -1) setSelectedIndex(index);
      else if (props.onSelect && users[0]) {
        props.onSelect(users[0], 0);
      }
    }
  }, [props.active, props.defaultId]);

  const onSelect = useCallback(
    (user: User, index: number) => {
      setSelectedIndex(index);
      if (props.onSelect) props.onSelect(user, index);
    },
    [props.onSelect]
  );

  return (
    <>
      <UserPicker />
      <AddUserDialog />
      <DeleteUserDialog />
      <UserList
        selectedIndex={selectedIndex}
        onSelect={onSelect}
        users={users}
      />
    </>
  );
};

export default UserPanel;
