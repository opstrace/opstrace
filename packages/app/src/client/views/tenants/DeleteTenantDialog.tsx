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

import React, { useState } from "react";
import { useDispatch } from "react-redux";

import useTenantList from "state/tenant/hooks/useTenantList";
import { usePickerService, PickerOption } from "client/services/Picker";
import { useCommandService } from "client/services/Command";

import { deleteTenant } from "state/tenant/actions";

import { Tenant } from "state/tenant/types";

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
      },
      dataTest: "deleteTenant"
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
