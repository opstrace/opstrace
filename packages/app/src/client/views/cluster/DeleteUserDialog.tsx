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
