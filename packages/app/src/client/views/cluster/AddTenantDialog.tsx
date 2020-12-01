import React from "react";

import { usePickerService } from "client/services/Picker";
import { useCommandService } from "client/services/Command";
import { addTenant } from "state/tenant/actions";
import { useDispatch } from "react-redux";

const AddTenantPicker = () => {
  const dispatch = useDispatch();

  const { activatePickerWithText } = usePickerService(
    {
      title: "Enter tenant name",
      activationPrefix: "add tenant:",
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
      onSelected: (option, tenant) => {
        if (option.id === "yes" && tenant) {
          dispatch(addTenant(tenant));
        }
      }
    },
    []
  );

  useCommandService({
    id: "add-tenant-picker",
    description: "Add Tenant",
    handler: e => {
      e.keyboardEvent?.preventDefault();
      activatePickerWithText("add tenant: ");
    }
  });

  return null;
};

export default React.memo(AddTenantPicker);
