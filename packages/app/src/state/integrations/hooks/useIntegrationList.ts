/**
 * Copyright 2020 Opstrace, Inc.
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
import { Integrations } from "state/integrations/types";

export const useIntegrationList = (tenant: Tenant | string): Integrations => {
  const tenant_id = isObj(tenant) ? (tenant as Tenant).id : tenant;

  const { data } = useHasura(
    `
      query integrations($tenant_id: uuid!) {
        integrations(where: {tenant_id: {_eq: $tenant_id}}) {
          id
          kind
          name
          status
          data
          tenant_id
          created_at
          updated_at
        }
      }
     `,
    { tenant_id: tenant_id }
  );

  return data?.integrations || [];
};
