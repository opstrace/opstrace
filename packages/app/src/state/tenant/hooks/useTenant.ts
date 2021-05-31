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

import { values, find, propEq } from "ramda";
import { useRouteMatch } from "react-router";
import { createSelector } from "reselect";

import { useSelector, State } from "state/provider";

import { Tenant } from "state/tenant/types";
import { useTenantListSubscription } from "./useTenantList";

export const selectTenant = createSelector(
  (state: State) => state.tenants.loading,
  (state: State) => state.tenants.tenants,
  (_: State, name: string) => name,
  (loading, tenants, name: string) => (loading ? null : tenants[name])
);

export const selectTenantById = createSelector(
  (state: State) => state.tenants.loading,
  (state: State) => state.tenants.tenants,
  (_: State, id: string) => id,
  (loading, tenants, id: string) =>
    loading ? null : find(propEq("id", id))(values(tenants))
);

export function useSelectedTenantWithFallback(): Tenant {
  const tenant = useSelectedTenant();
  // We may choose to change this default to pick one from the users tenant list
  return tenant
    ? tenant
    : {
        name: "system",
        type: "SYSTEM",
        created_at: "",
        updated_at: "",
        id: "",
        key: ""
      };
}

export function useSelectedTenant() {
  // Assumes we use the structure in our URL /tenant/<tenantId>/*
  const tenantRouteMatch = useRouteMatch<{ tenantId: string }>(
    "/tenant/:tenantId"
  );
  return useTenant(tenantRouteMatch?.params.tenantId || "");
}

export default function useTenant(
  tenantName: string
): Tenant | null | undefined {
  useTenantListSubscription();
  // can return undefined if the tenantName does not exist
  return useSelector((state: State) => selectTenant(state, tenantName));
}
