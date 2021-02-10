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
