/**
 * Copyright 2021 Opstrace, Inc.
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
import { useHistory } from "react-router-dom";

import { usePickerService } from "client/services/Picker";

import { Integration } from "state/integration/types";
import { Tenant } from "state/tenant/types";
import { installedIntegrationsPath } from "../paths";

import graphqlClient from "state/clients/graphqlClient";

import { Button } from "client/components/Button";

export const DeleteBtn = ({
  integration,
  tenant,
  disabled,
  deleteCallback
}: {
  integration: Integration;
  tenant: Tenant;
  disabled: boolean;
  deleteCallback?: Function;
}) => {
  const history = useHistory();

  const handleDelete = async () => {
    if (deleteCallback !== undefined) await deleteCallback();

    await graphqlClient.DeleteIntegration({
      tenant_id: tenant.id,
      id: integration.id
    });

    history.push(installedIntegrationsPath({ tenant }));
  };

  const { activatePickerWithText } = usePickerService(
    {
      title: `Delete "${integration.name}"?`,
      activationPrefix: `delete integration "${integration.name}" directly?:`,
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
        if (option.id === "yes") handleDelete();
      }
    },
    [integration.name, handleDelete]
  );

  return (
    <Button
      variant="contained"
      size="small"
      state="error"
      disabled={disabled}
      onClick={e => {
        e.stopPropagation();
        activatePickerWithText(
          `delete integration "${integration.name}" directly?:`
        );
      }}
    >
      Delete Integration
    </Button>
  );
};
