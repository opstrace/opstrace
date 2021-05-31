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
import { values } from "ramda";
import { createSelector } from "reselect";
import { useDispatch, useSelector, State } from "state/provider";

import { useSelectedTenantWithFallback } from "state/tenant/hooks/useTenant";

import {
  subscribeToIntegrationList,
  unsubscribeFromIntegrationList
} from "../actions";
import getSubscriptionID from "state/utils/getSubscriptionID";

export const selectIntegrationList = createSelector(
  (state: State) => state.integrations.loading,
  (state: State) => state.integrations.integrations,
  (loading, integrations) => (loading ? [] : values(integrations))
);

export const useIntegrationList = () => {
  useIntegrationListSubscription();
  return useSelector(selectIntegrationList);
};

export const useIntegrationListSubscription = () => {
  const tenant = useSelectedTenantWithFallback();
  const dispatch = useDispatch();

  useEffect(() => {
    // if (tenant) {
    const subId = getSubscriptionID();
    // make local ref of this inside useEffect scope so unsubscribe works
    const tenantName = tenant.name;
    dispatch(subscribeToIntegrationList({ subId, tenant: tenantName }));

    return () => {
      dispatch(unsubscribeFromIntegrationList({ subId, tenant: tenantName }));
    };
    // } else return null;
  }, [dispatch, tenant.name]);
};
