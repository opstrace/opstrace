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
import { useEffect } from "react";
import { values } from "ramda";
import { createSelector } from "reselect";
import { useDispatch, useSelector, State } from "state/provider";

import {
  subscribeToTenantList,
  unsubscribeFromTenantList
} from "state/tenant/actions";
import getSubscriptionID from "state/utils/getSubscriptionID";

export const selectTenantList = createSelector(
  (state: State) => state.tenants.loading,
  (state: State) => state.tenants.tenants,
  (loading, tenants) => (loading ? [] : values(tenants))
);

/**
 * Subscribes to tenants and will update on
 * any changes. Automatically unsubscribeFromTenantLists
 * on unmount.
 */
export default function useTenantList() {
  const tenants = useSelector(selectTenantList);
  const dispatch = useDispatch();

  useEffect(() => {
    const subId = getSubscriptionID();
    dispatch(subscribeToTenantList(subId));
    return () => {
      dispatch(unsubscribeFromTenantList(subId));
    };
  }, [dispatch]);

  return tenants;
}
