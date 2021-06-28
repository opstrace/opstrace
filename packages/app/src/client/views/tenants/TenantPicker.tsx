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
import { useHistory } from "react-router-dom";

import { useCommandService } from "client/services/Command";
import useTenantList from "state/tenant/hooks/useTenantList";

import { Tenant } from "state/tenant/types";

import { selectedTenantChanged } from "state/global/actions";

import { PickerOption, usePickerService } from "client/services/Picker";
import { useLastSelectedTenant } from "state/tenant/hooks/useTenant";

type TenantPickerOption = Pick<PickerOption, "id" | "text"> & { data: Tenant };

function tenantToPickerOption(tenant: Tenant): TenantPickerOption {
  return {
    text: tenant.name,
    id: tenant.name,
    data: tenant
  };
}

export const openTenantPickerCommandId = "select-tenant-picker";

const TenantPicker = () => {
  const dispatch = useDispatch();
  const history = useHistory();
  const tenants = useTenantList();
  const lastSelectedTenant = useLastSelectedTenant();

  const { activatePickerWithText } = usePickerService(
    {
      activationPrefix: "tenant:",
      options: tenants ? tenants.map(tenantToPickerOption) : [],
      onSelected: option => {
        dispatch(selectedTenantChanged({ tenant: option.data }));
        const { pathname } = history.location;
        const newRoute = lastSelectedTenant
          ? // if we're on a page with a tenant selected, stay on page and just replace the tenant
            pathname.replace(
              `/tenant/${lastSelectedTenant.name}`,
              `/tenant/${option.id}`
            )
          : // if no tenant has been selected yet, reroute to root tenant
            `/tenant/${option.id}`;
        history.push(newRoute);
      }
    },
    [tenants, lastSelectedTenant, history]
  );

  useCommandService({
    id: openTenantPickerCommandId,
    description: "Select Tenant",
    handler: e => {
      e.keyboardEvent?.preventDefault();
      activatePickerWithText("tenant: ");
    }
  });

  return null;
};

export default React.memo(TenantPicker);
