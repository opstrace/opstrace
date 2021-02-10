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

import React, { useState } from "react";

import useUserList from "state/user/hooks/useUserList";
import { deleteUser } from "state/user/actions";
import { usePickerService, PickerOption } from "client/services/Picker";
import { useCommandService } from "client/services/Command";
import { User } from "state/user/types";
import { useDispatch } from "react-redux";

function userToPickerOption(user: User): PickerOption {
  return {
    text: user.email,
    id: user.email
  };
}

const DeleteUserPicker = () => {
  const users = useUserList();
  const [email, setSelectedEmail] = useState<string>("");
  const dispatch = useDispatch();

  const { activatePickerWithText } = usePickerService(
    {
      title: `Delete ${email}?`,
      activationPrefix: "delete user?:",
      disableFilter: true,
      disableInput: true,
      options: [
        {
          id: "yes",
          text: `yes`
        },
        {
          id: "no",
          text: "no"
        }
      ],
      onSelected: option => {
        if (option.id === "yes" && email) {
          dispatch(deleteUser(email));
        }
      }
    },
    [email]
  );

  usePickerService(
    {
      title: "Enter user's email",
      activationPrefix: "delete user:",
      options: users ? users.map(userToPickerOption) : [],
      onSelected: option => {
        setSelectedEmail(option.id);
        activatePickerWithText("delete user?: ");
      }
    },
    [users, activatePickerWithText]
  );

  useCommandService(
    {
      id: "delete-user-picker",
      description: "Delete User",
      disabled: users.length < 2,
      handler: e => {
        e.keyboardEvent?.preventDefault();
        activatePickerWithText("delete user: ");
      }
    },
    [users.length]
  );

  return null;
};

export default React.memo(DeleteUserPicker);
