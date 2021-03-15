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

import { createSelector } from "reselect";
import { useSelector, State } from "state/provider";

export const selectTenant = createSelector(
  (state: State) => state.tenants.loading,
  (state, _) => state.tenants.tenants,
  (_: State, tenantName: string) => tenantName,
  (loading, tenants, tenantName: string) =>
    loading ? null : tenants[tenantName]
);

export default function useTenant(tenantName: string) {
  return useSelector((state: State) => selectTenant(state, tenantName));
}
