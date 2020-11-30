import React from "react";

import { PickerOption, usePickerService } from "client/services/Picker";
import { useCommandService } from "client/services/Command";
import { useHistory } from "react-router-dom";
import useUserList from "state/user/hooks/useUserList";
import { User } from "state/user/types";

function userToPickerOption(user: User): PickerOption {
  return {
    text: user.email,
    id: user.opaque_id
  };
}

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
