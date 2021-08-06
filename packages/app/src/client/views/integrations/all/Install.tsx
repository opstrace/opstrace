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
import { useParams, useHistory } from "react-router-dom";

import {
  integrationDefRecords,
  NewIntegration,
  NewIntegrationOptions,
  showIntegrationPath
} from "client/integrations";

import {
  addIntegration,
  loadGrafanaStateForIntegration
} from "state/integration/actions";
import graphqlClient, {
  isGraphQLClientError
} from "state/clients/graphqlClient";

import { createFolder, isGrafanaError } from "client/utils/grafana";

import NotFound from "client/views/404/404";
import { useSelectedTenantWithFallback } from "state/tenant/hooks/useTenant";
import { useSimpleNotification } from "client/services/Notification";

export const InstallIntegration = () => {
  const { integrationKind: kind } = useParams<{
    integrationKind: string;
  }>();
  const dispatch = useDispatch();
  const history = useHistory();
  const tenant = useSelectedTenantWithFallback();
  const { registerNotification } = useSimpleNotification();

  const integration = integrationDefRecords[kind];
  if (!integration) return <NotFound />;

  const onCreate = async <IntegrationData,>(
    data: NewIntegration<IntegrationData>,
    options?: NewIntegrationOptions
  ) => {
    let response;
    try {
      response = await graphqlClient.InsertIntegration({
        name: data.name,
        kind: kind,
        data: data.data || {},
        tenant_id: tenant.id
      });
    } catch (error) {
      registerNotification({
        state: "error" as const,
        title: "Could not install integration",
        information: isGraphQLClientError(error)
          ? error.response.errors![0].message
          : error.message
      });
      return;
    }
    const integration = response.data?.insert_integration_one;
    if (integration) {
      dispatch(addIntegration({ integration }));

      if (options?.createGrafanaFolder) {
        try {
          await createFolder({ integration, tenant });
        } catch (error) {
          registerNotification({
            state: "error" as const,
            title: "Could not create grafana folder",
            information: isGrafanaError(error)
              ? error.response.data.message
              : error.message
          });
          return;
        }
        dispatch(loadGrafanaStateForIntegration({ id: integration.id }));
      }

      history.push(
        showIntegrationPath({
          tenant,
          integration: integration
        })
      );
    }
  };

  return <integration.Form handleCreate={onCreate} />;
};
