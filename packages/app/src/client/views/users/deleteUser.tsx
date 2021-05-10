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
import { useDispatch } from "react-redux";

import { usePickerService } from "client/services/Picker";
import useCurrentUser from "state/user/hooks/useCurrentUser";

import { deleteUser } from "state/user/actions";
import { Button } from "client/components/Button";
import { User } from "state/user/types";

const DeleteUserButton = ({ user }: { user: User }) => {
  const dispatch = useDispatch();
  const currentUser = useCurrentUser();

  const { activatePickerWithText } = usePickerService(
    {
      title: `Delete ${user.email}?`,
      activationPrefix: `delete user ${user.email} directly?:`,
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
        if (option.id === "yes" && user.id) dispatch(deleteUser(user.id));
      }
    },
    [user.id]
  );

  return (
    <Button
      variant="outlined"
      state="error"
      size="small"
      disabled={currentUser.email === user.email}
      onClick={e => {
        e.stopPropagation();
        activatePickerWithText(`delete user ${user.email} directly?: `);
      }}
    >
      Delete
    </Button>
  );
};

export default DeleteUserButton;
