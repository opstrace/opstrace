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
import { useDispatch } from "react-redux";
import { useHistory } from "react-router-dom";

import { usePickerService } from "client/services/Picker";

import { Integration } from "state/integration/types";
import { Tenant } from "state/tenant/types";
import { installedIntegrationsPath } from "../paths";

import { deleteIntegration } from "state/integration/actions";
import graphqlClient from "state/clients/graphqlClient";

import { Button } from "client/components/Button";

export const UninstallBtn = ({
  integration,
  tenant,
  disabled,
  uninstallCallback
}: {
  integration: Integration;
  tenant: Tenant;
  disabled: boolean;
  uninstallCallback?: Function;
}) => {
  const dispatch = useDispatch();
  const history = useHistory();

  const handleUninstall = async () => {
    if (uninstallCallback !== undefined) await uninstallCallback();

    try {
      await graphqlClient
        .DeleteIntegration({
          tenant_id: tenant.id,
          id: integration.id
        })
        .then(() => {
          dispatch(
            deleteIntegration({ tenantId: tenant.id, id: integration.id })
          );
          history.push(installedIntegrationsPath({ tenant }));
        });
    } catch (err) {
      console.log(err);
    }
  };

  const { activatePickerWithText } = usePickerService(
    {
      title: `Uninstall "${integration.name}"?`,
      activationPrefix: `uninstall integration "${integration.name}" directly?:`,
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
        if (option.id === "yes") handleUninstall();
      }
    },
    [integration.name, handleUninstall]
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
          `uninstall integration "${integration.name}" directly?:`
        );
      }}
    >
      Uninstall Integration
    </Button>
  );
};
