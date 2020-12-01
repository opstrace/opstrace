import React from "react";

import { PickerOption, usePickerService } from "client/services/Picker";
import { useCommandService } from "client/services/Command";
import { useHistory } from "react-router-dom";
import useTenantList from "state/tenant/hooks/useTenantList";
import { Tenant } from "state/tenant/types";

function tenantToPickerOption(tenant: Tenant): PickerOption {
  return {
    text: tenant.name,
    id: tenant.name
  };
}

const TenantPicker = () => {
  const history = useHistory();
  const tenants = useTenantList();

  const { activatePickerWithText } = usePickerService(
    {
      activationPrefix: "tenant:",
      options: tenants ? tenants.map(tenantToPickerOption) : [],
      onSelected: option => {
        history.push(`/cluster/tenants/${option.id}`);
      }
    },
    [tenants, history]
  );

  useCommandService({
    id: "select-tenant-picker",
    description: "Select Tenant",
    handler: e => {
      e.keyboardEvent?.preventDefault();
      activatePickerWithText("tenant: ");
    }
  });

  return null;
};

export default React.memo(TenantPicker);
