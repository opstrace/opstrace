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

import { useSelector, useDispatch, State } from "state/provider";
import { getTenantList } from "./useTenantList";
import { selectTenant } from "./useTenant";

import { loadAlertmanagerConfig } from "state/tenant/actions";

export const selectAlertmanagerConfig = (state: State, tenantName: string) => {
  // console.log(">>", getTenantList(state), tenantName);

  return selectTenant(getTenantList(state), tenantName)?.alertmanager_config;
};
/**
 * Subscribes to tenants and will update on
 * any changes. Automatically unsubscribeFromTenantLists
 * on unmount.
 */
export default function useAlertmanagerConfig(tenantName: string) {
  const config = useSelector((state: State) =>
    selectAlertmanagerConfig(state, tenantName)
  );
  const dispatch = useDispatch();

  // console.log("useAlertmanagerConfig", tenantName, config);

  if (!config) dispatch(loadAlertmanagerConfig(tenantName));

  return config;
}
