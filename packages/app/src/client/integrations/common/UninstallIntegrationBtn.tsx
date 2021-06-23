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
import { isFunction } from "ramda-adjunct";
import { useDispatch } from "react-redux";
import { useHistory } from "react-router-dom";

import { usePickerService } from "client/services/Picker";

import { IntegrationProps } from "client/integrations/types";
import { installedIntegrationsPath } from "../paths";

import { deleteIntegration } from "state/integration/actions";
import graphqlClient from "state/clients/graphqlClient";

import { deleteFolder } from "client/utils/grafana";

import { Button } from "client/components/Button";

export const UninstallBtn = (props: IntegrationProps) => {
  const { integration, tenant, plugin } = props;
  const dispatch = useDispatch();
  const history = useHistory();

  const handleUninstall = async () => {
    if (isFunction(plugin.uninstallCallback))
      await plugin.uninstallCallback(props);

    try {
      await graphqlClient
        .DeleteIntegration({
          tenant_id: tenant.id,
          id: integration.id
        })
        .then(() => {
          deleteFolder({ integration, tenant }).catch(err => {
            // Dashboard folder might not exist
            console.log(err);
          });
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
