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
import { useParams } from "react-router-dom";
import { useHistory } from "react-router-dom";

import { withTenantFromParams, TenantProps } from "client/views/tenant/utils";

import { Integration } from "state/integrations/types";
import { integrationDefRecords } from "client/viewsBasic/integrationDefs";
import { showIntegrationPath } from "client/viewsBasic/tenantIntegrations/paths";

import graphqlClient from "state/clients/graphqlClient";

import NotFound from "client/views/404/404";

export type NewIntegration = {
  name: string;
  data: {};
};

export const AddIntegration = withTenantFromParams(
  ({ tenant }: TenantProps) => {
    const { integrationKind: kind } = useParams<{
      integrationKind: string;
    }>();
    const history = useHistory();

    const integration = integrationDefRecords[kind];
    if (!integration) return <NotFound />;

    const onCreate = (data: NewIntegration) => {
      graphqlClient
        .InsertIntegration({
          name: data.name,
          kind: "k8s-metrics",
          status: "active",
          data: data.data || {},
          tenant_id: tenant.id
        })
        .then(response => {
          const integration = response?.data
            ?.insert_integrations_one as Integration;
          if (integration)
            history.push(
              showIntegrationPath({
                tenant,
                integration: integration
              })
            );
        });
    };

    return <integration.Form handleCreate={onCreate} />;
  }
);
