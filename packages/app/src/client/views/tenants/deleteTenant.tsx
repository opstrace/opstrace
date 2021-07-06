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

import { usePickerService } from "client/services/Picker";

import { deleteTenant } from "state/tenant/actions";
import { Button } from "client/components/Button";
import { Tenant } from "state/tenant/types";

const DeleteTenantButton = ({ tenant }: { tenant: Tenant }) => {
  const dispatch = useDispatch();

  const { activatePickerWithText } = usePickerService(
    {
      title: `Delete ${tenant.name}?`,
      activationPrefix: `delete tenant ${tenant.name} directly?:`,
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
        if (option.id === "yes" && tenant.name)
          dispatch(deleteTenant(tenant.name));
      },
      dataTest: "deleteTenant"
    },
    [tenant.name]
  );

  return (
    <Button
      variant="outlined"
      state="error"
      size="small"
      disabled={tenant.type === "SYSTEM"}
      data-test={`tenant/deleteBtn/${tenant.name}`}
      onClick={e => {
        e.stopPropagation();
        activatePickerWithText(`delete tenant ${tenant.name} directly?: `);
      }}
    >
      Delete
    </Button>
  );
};

export default DeleteTenantButton;
