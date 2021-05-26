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

import {
  createReducer,
  createAsyncAction,
  ActionType,
} from "typesafe-actions";
import { log } from "@opstrace/utils";
import { ResourceCache } from "./util";

import dbClient from "../../dbClient";

export interface Integration {
  id: string;
  kind: string;
  tenant_id: string;
  name: string;
  // This data is defined on a per-integration basis, see *IntegrationData types.
  // Some integration kinds do not involve the controller at all, so we allow this to be any.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}
export type Integrations = Integration[];

export const actions = {
  fetch: createAsyncAction(
    "FETCH_GRAPHQL_INTEGRATIONS_REQUEST",
    "FETCH_GRAPHQL_INTEGRATIONS_SUCCESS",
    "FETCH_GRAPHQL_INTEGRATIONS_FAILURE"
  )<Record<string, unknown>, { resources: Integrations }, { error: Error }>()
};
export type IntegrationActions = ActionType<typeof actions>;
export type IntegrationState = ResourceCache<Integration>;

const initialState: IntegrationState = {
  loaded: false,
  error: null,
  resources: []
};

export const reducer = createReducer<
  IntegrationState,
  IntegrationActions
>(initialState)
  .handleAction(
    actions.fetch.request,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (state, _): IntegrationState => ({
      ...state,
      loaded: false
    })
  )
  .handleAction(
    actions.fetch.success,
    (state, action): IntegrationState => ({
      ...state,
      ...action.payload,
      error: null,
      loaded: true
    })
  )
  .handleAction(
    actions.fetch.failure,
    (state, action): IntegrationState => ({
      ...state,
      ...action.payload,
      loaded: false
    })
  );

export function startInformer(
  channel: (input: unknown) => void
): () => void {
  let cancelled = false;
  // We use a polling loop rather than a GraphQL subscription.
  // In CI runs, subscriptions were occasionally failing to get any data, primarily on GCP clusters.
  const poll = async () => {
    if (cancelled) {
      return;
    }
    if (!dbClient) {
      log.warning(
        "skipping integration sync due to missing env vars GRAPHQL_ENDPOINT & HASURA_GRAPHQL_ADMIN_SECRET"
      );
      return;
    }
    try {
      const res = await dbClient.GetIntegrationsDump();
      if (res.data?.integration) {
        channel(
          actions.fetch.success({
            resources: res.data?.integration
          })
        );
      }
      // refresh in 3s
      return setTimeout(poll, 3000);
    } catch (error) {
      channel(actions.fetch.failure({ error }));
      log.warning("polling integrations failed (retrying in 15s): %s", error);
      // seems like a good idea to wait a bit longer in the event of failure
      return setTimeout(poll, 15000);
    }
  };
  poll();
  // Return a function to stop the polling loop
  return () => {
    cancelled = true;
  };
}
