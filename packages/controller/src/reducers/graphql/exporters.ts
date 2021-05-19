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

export interface Exporter {
  name: string;
  tenant: string;
  type: string;
  credential?: string | null;
  config: string;
}
export type Exporters = Exporter[];

export const actions = {
  fetch: createAsyncAction(
    "FETCH_GRAPHQL_EXPORTERS_REQUEST",
    "FETCH_GRAPHQL_EXPORTERS_SUCCESS",
    "FETCH_GRAPHQL_EXPORTERS_FAILURE"
  )<Record<string, unknown>, { resources: Exporters }, { error: Error }>()
};
export type ExporterActions = ActionType<typeof actions>;
export type ExporterState = ResourceCache<Exporter>;

const initialState: ExporterState = {
  loaded: false,
  error: null,
  resources: []
};

export const reducer = createReducer<
  ExporterState,
  ExporterActions
>(initialState)
  .handleAction(
    actions.fetch.request,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (state, _): ExporterState => ({
      ...state,
      loaded: false
    })
  )
  .handleAction(
    actions.fetch.success,
    (state, action): ExporterState => ({
      ...state,
      ...action.payload,
      error: null,
      loaded: true
    })
  )
  .handleAction(
    actions.fetch.failure,
    (state, action): ExporterState => ({
      ...state,
      ...action.payload,
      loaded: false
    })
  );

export function startInformer(
  channel: (input: unknown) => void
): () => void {
  let cancelled = false;
  // We use a polling loop rather than a subscription.
  // Subscriptions were occasionally failing to get any data in CI tests.
  const poll = async () => {
    if (cancelled) {
      return;
    }
    if (!dbClient) {
      log.warning(
        "skipping exporter sync due to missing env vars GRAPHQL_ENDPOINT & HASURA_GRAPHQL_ADMIN_SECRET"
      );
      return;
    }
    try {
      const res = await dbClient.GetExportersDump();
      if (res.data?.exporter) {
        channel(
          actions.fetch.success({
            resources: res.data?.exporter
          })
        );
      }
      return setTimeout(poll, 3000);
    } catch (error) {
      channel(actions.fetch.failure({ error }));
      log.warning("polling exporters failed (retrying in 15s): %s", error);
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
