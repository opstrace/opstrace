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
    // const Form = integration.Form;

    const onCreate = (data: NewIntegration) => {
      graphqlClient
        .InsertIntegrations({
          integrations: {
            tenant_id: tenant.id,
            kind: "k8sMetrics",
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

// {data: {…}, headers: Headers, status: 200}
// data:
// insert_integrations:
// returning: Array(1)
// 0:
// created_at: "2021-05-10T02:10:48.907139"
// id: "16fe15cb-9b87-4765-9ba2-99e6d6a89d74"
// kind: "k8sMetrics"
// name: "My Dev Cluster"
// status: "pending"
// tenant_id: "8c97adfa-b4a9-4ce7-a65f-128f57f781ed"
// updated_at: "2021-05
