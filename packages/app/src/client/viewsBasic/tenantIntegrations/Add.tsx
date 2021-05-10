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
import { integrationRecords } from "client/viewsBasic/integrations";
import { showIntegrationPath } from "client/viewsBasic/integrations/paths";

import graphqlClient from "state/clients/graphqlClient";

import NotFound from "client/views/404/404";

export type NewIntegration = {
  name: string;
  metadata: {};
};

export const AddIntegration = withTenantFromParams(
  ({ tenant }: TenantProps) => {
    const { integrationKind: kind } = useParams<{
      integrationKind: string;
    }>();
    const history = useHistory();

    const integration = integrationRecords[kind];
    if (!integration) return <NotFound />;

    const onCreate = (data: NewIntegration) => {
      graphqlClient
        .InsertIntegrations({
          integrations: {
            tenant_id: tenant.id,
            kind: "k8s-metrics",
            name: data.name,
            status: "pending"
          }
        })
        .then(response => {
          const integration = response?.data?.insert_integrations
            ?.returning[0] as Integration | undefined;
          if (integration)
            history.push(showIntegrationPath({ tenant, integration }));
          console.log("integration created", response);
        });
    };

    return <integration.Form handleCreate={onCreate} />;
  }
);
