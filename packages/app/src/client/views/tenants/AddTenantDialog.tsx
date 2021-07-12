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

import { tenantNameValidator } from "client/utils/regex";
import { isTenantNameUnique } from "state/tenant/utils";

import { usePickerService } from "client/services/Picker";
import { useCommandService } from "client/services/Command";
import useTenantList from "state/tenant/hooks/useTenantList";

import { addTenant } from "state/tenant/actions";

export const addTenantCommandId = "add-tenant-picker";

const AddTenantPicker = () => {
  const dispatch = useDispatch();
  const tenants = useTenantList();

  const { activatePickerWithText } = usePickerService(
    {
      title: "Enter tenant name",
      activationPrefix: "add tenant:",
      disableFilter: true,
      textValidator: (filterValue: string) => {
        if (filterValue.length < 1) return "Enter new Tenant name";
        else if (!tenantNameValidator.test(filterValue))
          return "2 or more lowercase alpha-numeric characters";
        else if (!isTenantNameUnique(filterValue, tenants))
          return "Tenant name must be unique";
        else return true;
      },

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
      onSelected: (option, tenantName) => {
        if (option.id === "yes" && tenantName) dispatch(addTenant(tenantName));
      },
      dataTest: "addTenant"
    },
    [tenants]
  );

  useCommandService({
    id: addTenantCommandId,
    description: "Add Tenant",
    handler: e => {
      e.keyboardEvent?.preventDefault();
      activatePickerWithText("add tenant: ");
    }
  });

  return null;
};

export default React.memo(AddTenantPicker);
