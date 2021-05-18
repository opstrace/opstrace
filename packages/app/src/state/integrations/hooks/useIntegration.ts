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

import { isObj } from "ramda-adjunct";

import useHasura from "client/hooks/useHasura";
import useHasuraSubscription from "client/hooks/useHasuraSubscription";

import { Tenant } from "state/tenant/types";
import { Integration } from "state/integrations/types";

type TenantOrId = Tenant | string;

const getTenantId = (tenant: TenantOrId): string =>
  isObj(tenant) ? (tenant as Tenant).id : tenant;

const makeVariables = (tenant: TenantOrId, id: string) => ({
  tenant_id: getTenantId(tenant),
  id: id
});

export const useIntegration = (tenant: TenantOrId, id: string): Integration => {
  const { data } = useHasura(QUERY, makeVariables(tenant, id));
  return data?.tenant[0]?.integrations[0] || null;
};

export const useIntegrationSub = (
  tenant: TenantOrId,
  id: string
): Integration => {
  const { data } = useHasuraSubscription(
    SUBSCRIPTION,
    makeVariables(tenant, id)
  );
  return data?.tenant[0]?.integrations[0] || null;
};

const FIELDS = `
        id
        kind
        name
        status
        data
        tenant_id
        grafana_metadata
        created_at
        updated_at
`;

const QUERY = `
  query integration($tenant_id: uuid!, $id: uuid!) {
    tenant(where: {id: {_eq: $tenant_id}}) {
      integrations(where: {id: {_eq: $id}}) {
        ${FIELDS}
      }
    }
  }
`;

const SUBSCRIPTION = `
  subscription IntegrationStatus($tenant_id: uuid!, $id: uuid!) {
    tenant(where: {id: {_eq: $tenant_id}}) {
      integrations(where: {id: {_eq: $id}}) {
        ${FIELDS}
      }
    }
  }
`;
