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

import { deleteFolder } from "client/utils/grafana";

import { Button } from "client/components/Button";
import { useSimpleNotification } from "client/services/Notification";

export const UninstallBtn = ({
  integration,
  tenant,
  disabled,
  uninstallCallback
}: {
  integration: Integration;
  tenant: Tenant;
  disabled: boolean;
  uninstallCallback?: () => Promise<void> | void;
}) => {
  const dispatch = useDispatch();
  const history = useHistory();
  const { registerNotification } = useSimpleNotification();

  const handleUninstall = async () => {
    if (uninstallCallback !== undefined) await uninstallCallback();

    try {
      await graphqlClient.DeleteIntegration({
        tenant_id: tenant.id,
        id: integration.id
      });
      try {
        await deleteFolder({ integration, tenant });
      } catch (error) {
        registerNotification({
          state: "error" as const,
          title: "Could not delete grafana folder",
          information: error.response.data.message ?? error.message
        });
      }
      dispatch(deleteIntegration({ tenantId: tenant.id, id: integration.id }));
      history.push(installedIntegrationsPath({ tenant }));
    } catch (error) {
      registerNotification({
        state: "error" as const,
        title: "Could not uninstall integration",
        information: error.response.errors?.[0].message ?? error.message
      });
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
