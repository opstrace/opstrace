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

import { useEffect } from "react";
import { useRouteMatch } from "react-router";
import { createSelector } from "reselect";
import { useSelector, State, useDispatch } from "state/provider";
import getSubscriptionID from "state/utils/getSubscriptionID";
import { subscribeToTenantList, unsubscribeFromTenantList } from "../actions";
import { Tenant } from "../types";

export const selectTenant = createSelector(
  (state: State) => state.tenants.loading,
  (state, _) => state.tenants.tenants,
  (_: State, tenantName: string) => tenantName,
  (loading, tenants, tenantName: string) =>
    loading ? null : tenants[tenantName]
);

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
  const dispatch = useDispatch();

  useEffect(() => {
    const subId = getSubscriptionID();
    dispatch(subscribeToTenantList(subId));
    return () => {
      dispatch(unsubscribeFromTenantList(subId));
    };
  }, [dispatch]);
  // can return undefined if the tenantName does not exist
  return useSelector((state: State) => selectTenant(state, tenantName));
}
