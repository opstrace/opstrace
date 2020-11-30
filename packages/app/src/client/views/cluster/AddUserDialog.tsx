import React from "react";

import { usePickerService } from "client/services/Picker";
import { useCommandService } from "client/services/Command";
import { addUser } from "state/user/actions";
import { useDispatch } from "react-redux";

// eslint-disable-next-line no-useless-escape
const emailValidator = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;

const AddUserPicker = () => {
  const dispatch = useDispatch();

  const { activatePickerWithText } = usePickerService(
    {
      title: "Enter user's email",
      activationPrefix: "add user:",
      disableFilter: true,
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
        if (option.id === "yes" && email && emailValidator.test(email)) {
          dispatch(addUser(email));
        }
      }
    },
    []
  );

  useCommandService({
    id: "add-user-picker",
    description: "Add User",
    handler: e => {
      e.keyboardEvent?.preventDefault();
      activatePickerWithText("add user: ");
    }
  });

  return null;
};

export default React.memo(AddUserPicker);
