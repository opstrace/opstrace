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
import { useParams } from "react-router";

import { useSelector, State, useDispatch } from "state/provider";
import { useSelectedTenantWithFallback } from "state/tenant/hooks/useTenant";
import getSubscriptionID from "state/utils/getSubscriptionID";
import {
  subscribeToIntegrationList,
  unsubscribeFromIntegrationList
} from "../actions";

export const getIntegrationList = (state: State) => {
  return state.integrations.list;
};

export function useSelectedIntegration() {
  const params = useParams<{ integrationId: string }>();
  return useIntegration(params.integrationId || "");
}

export const useIntegration = (id: string) => {
  const integrations = useIntegrationList();

  return integrations.find(integration => integration.id === id);
};

/**
 * Subscribes to integrations and will update on
 * any changes. Automatically unsubscribeFromIntegrationLists
 * on unmount.
 */
export default function useIntegrationList() {
  const tenant = useSelectedTenantWithFallback();
  const integrations = useSelector(getIntegrationList);
  const dispatch = useDispatch();

  useEffect(() => {
    const subId = getSubscriptionID();
    // make local ref of this inside useEffect scope so unsubscribe works
    const tenantName = tenant.name;
    dispatch(subscribeToIntegrationList({ subId, tenant: tenantName }));

    return () => {
      dispatch(unsubscribeFromIntegrationList({ subId, tenant: tenantName }));
    };
  }, [dispatch, tenant.name]);

  return integrations;
}
