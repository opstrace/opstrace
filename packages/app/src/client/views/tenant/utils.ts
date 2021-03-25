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

import { map } from "ramda";

import { Tenant, Tenants } from "state/tenant/types";
import { PanelItem } from "client/components/Panel";

export const tenantToItem = (tenant: Tenant): PanelItem => {
  return { id: tenant.name, text: tenant.name, data: tenant };
};

export const tenantsToItems: (tenants: Tenants) => PanelItem[] = map(
  tenantToItem
);
