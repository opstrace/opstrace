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
  showIntegrationPath
} from "client/integrations";

import {
  addIntegration,
  loadGrafanaStateForIntegration
} from "state/integration/actions";
import graphqlClient from "state/clients/graphqlClient";

import { createFolder } from "client/utils/grafana";

import NotFound from "client/views/404/404";
import { useSelectedTenantWithFallback } from "state/tenant/hooks/useTenant";

export type NewIntegration = {
  name: string;
  data: {};
};

type NewIntegrationOptions = {
  createGrafanaFolder?: boolean;
};

export const AddIntegration = () => {
  const { integrationKind: kind } = useParams<{
    integrationKind: string;
  }>();
  const dispatch = useDispatch();
  const history = useHistory();
  const tenant = useSelectedTenantWithFallback();

  const integration = integrationDefRecords[kind];
  if (!integration) return <NotFound />;

  const onCreate = (data: NewIntegration, options?: NewIntegrationOptions) => {
    graphqlClient
      .InsertIntegration({
        name: data.name,
        kind: kind,
        data: data.data || {},
        tenant_id: tenant.id
      })
      .then(response => {
        const integration = response?.data?.insert_integration_one;
        if (integration) {
          dispatch(addIntegration({ integration }));

          if (options?.createGrafanaFolder) {
            createFolder({ integration, tenant }).then(() =>
              dispatch(loadGrafanaStateForIntegration({ id: integration.id }))
            );
          }

          history.push(
            showIntegrationPath({
              tenant,
              integration: integration
            })
          );
        }
      });
  };

  return <integration.Form handleCreate={onCreate} />;
};
