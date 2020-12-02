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
