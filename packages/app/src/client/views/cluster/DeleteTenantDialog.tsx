import React, { useState } from "react";

import useTenantList from "state/tenant/hooks/useTenantList";
import { deleteTenant } from "state/tenant/actions";
import { usePickerService, PickerOption } from "client/services/Picker";
import { useCommandService } from "client/services/Command";
import { Tenant } from "state/tenant/types";
import { useDispatch } from "react-redux";

function tenantToPickerOption(tenant: Tenant): PickerOption {
  return {
    text: tenant.name,
    id: tenant.name
  };
}

const DeleteTenantPicker = () => {
  const tenants = useTenantList();
  const [name, setSelectedName] = useState<string>("");
  const dispatch = useDispatch();

  const { activatePickerWithText } = usePickerService(
    {
      title: `Delete ${name}?`,
      activationPrefix: "delete tenant?:",
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
        if (option.id === "yes" && name) {
          dispatch(deleteTenant(name));
        }
      }
    },
    [name]
  );

  usePickerService(
    {
      title: "Enter tenant name",
      activationPrefix: "delete tenant:",
      options: tenants ? tenants.map(tenantToPickerOption) : [],
      onSelected: option => {
        setSelectedName(option.id);
        activatePickerWithText("delete tenant?: ");
      }
    },
    [tenants, activatePickerWithText]
  );

  useCommandService(
    {
      id: "delete-tenant-picker",
      description: "Delete Tenant",
      disabled: tenants.length < 2,
      handler: e => {
        e.keyboardEvent?.preventDefault();
        activatePickerWithText("delete tenant: ");
      }
    },
    [tenants.length]
  );

  return null;
};

export default React.memo(DeleteTenantPicker);
