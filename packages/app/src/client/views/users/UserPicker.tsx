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

import React from "react";
import { useHistory } from "react-router-dom";

import { useCommandService } from "client/services/Command";

import { User } from "state/user/types";

import useUserList from "state/user/hooks/useUserList";
import { PickerOption, usePickerService } from "client/services/Picker";

export const userToPickerOption = (user: User): PickerOption => ({
  text: user.email,
  id: user.id
});

const UserPicker = () => {
  const history = useHistory();
  const users = useUserList();

  const { activatePickerWithText } = usePickerService(
    {
      activationPrefix: "user:",
      options: users ? users.map(userToPickerOption) : [],
      onSelected: option => {
        history.push(`/cluster/users/${option.id}`);
      }
    },
    [users, history]
  );

  useCommandService({
    id: "select-user-picker",
    description: "Select User",
    handler: e => {
      e.keyboardEvent?.preventDefault();
      activatePickerWithText("user: ");
    }
  });

  return null;
};

export default React.memo(UserPicker);
