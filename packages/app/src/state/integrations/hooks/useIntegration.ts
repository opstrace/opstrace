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

import { Tenant } from "state/tenant/types";
import { Integration } from "state/integrations/types";

export const useIntegration = (
  tenant: Tenant | string,
  id: string
): Integration => {
  const tenant_id = isObj(tenant) ? (tenant as Tenant).id : tenant;

  const { data } = useHasura(
    `
      query integration($tenant_id: uuid!, $id: uuid!) {
        tenant(where: {id: {_eq: $tenant_id}}) {
          integrations(where: {id: {_eq: $id}}) {
            created_at
            id
            kind
            name
            status
            tenant_id
            updated_at
          }
        }
      }
     `,
    { tenant_id: tenant_id, id: id }
  );

  return data?.tenant[0]?.integrations[0] || null;
};
