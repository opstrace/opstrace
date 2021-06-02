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

  const { activatePickerWithText } = usePickerService(
    {
      activationPrefix: "tenant:",
      options: tenants ? tenants.map(tenantToPickerOption) : [],
      onSelected: option => {
        dispatch(selectedTenantChanged({ tenant: option.data }));
        history.push(`/tenant/${option.id}`); // todo: would be nice to keep the current path and simply change the tenant rather than send user back to the home for the tenant
      }
    },
    [tenants, history]
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
