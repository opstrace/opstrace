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
import { useCommandService } from "client/services/Command";
import { addUser } from "state/user/actions";

// eslint-disable-next-line no-useless-escape
const emailValidator =
  /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;

export const addUserCommandId = "add-user-picker";

const AddUserPicker = () => {
  const dispatch = useDispatch();

  const { activatePickerWithText } = usePickerService(
    {
      title: "Enter user's email",
      activationPrefix: "add user:",
      disableFilter: true,
      textValidator: (email: string) => {
        if (email.length < 1) return "Enter new user's email";
        else if (!emailValidator.test(email))
          return "It must be a valid email address";
        else return true;
      },
      options: [
        {
          id: "yes",
          text: `add`
        },
        {
          id: "no",
          text: "cancel"
        }
      ],
      onSelected: (option, email) => {
        if (email && option.id === "yes") {
          dispatch(addUser(email));
        }
      }
    },
    []
  );

  useCommandService({
    id: addUserCommandId,
    description: "Add User",
    handler: e => {
      e.keyboardEvent?.preventDefault();
      activatePickerWithText("add user: ");
    }
  });

  return null;
};

export default React.memo(AddUserPicker);
