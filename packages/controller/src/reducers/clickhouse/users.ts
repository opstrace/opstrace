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

import { createReducer, createAsyncAction, ActionType } from "typesafe-actions";
import { log } from "@opstrace/utils";
import { ResourceCache } from "../util";

import { dbClient } from "../../clickhouseClient";

export const actions = {
  fetch: createAsyncAction(
    "FETCH_CLICKHOUSE_USERS_REQUEST",
    "FETCH_CLICKHOUSE_USERS_SUCCESS",
    "FETCH_CLICKHOUSE_USERS_FAILURE"
  )<Record<string, unknown>, string[], { error: Error }>()
};
export type ClickHouseDBActions = ActionType<typeof actions>;
export type ClickHouseUserState = ResourceCache<string[]>;

const initialState: ClickHouseUserState = {
  loaded: false,
  error: null,
  resources: []
};

export const reducer = createReducer<ClickHouseUserState, ClickHouseDBActions>(
  initialState
)
  .handleAction(
    actions.fetch.request,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (state, _): ClickHouseUserState => ({
      ...state,
      loaded: false
    })
  )
  .handleAction(
    actions.fetch.success,
    (state, action): ClickHouseUserState => ({
      ...state,
      ...action.payload,
      error: null,
      loaded: true
    })
  )
  .handleAction(
    actions.fetch.failure,
    (state, action): ClickHouseUserState => ({
      ...state,
      ...action.payload,
      loaded: false
    })
  );

export function startInformer(channel: (input: unknown) => void): () => void {
  let cancelled = false;
  //@ts-ignore: TS7023 'poll' implicitly has return type 'any'
  const poll = async () => {
    if (cancelled) {
      return;
    }
    if (!dbClient) {
      log.warning(
        "skipping ClickHouse user sync due to missing env var CLICKHOUSE_URL"
      );
      return;
    }
    try {
      const users = await dbClient.query("SHOW USERS").toPromise();
      log.warning(`users: ${users}`); // TODO remove
      channel(
        actions.fetch.success(
          [] // TODO convert list to strings
        )
      );
      // refresh in 3s
      return setTimeout(poll, 3000);
    } catch (error: any) {
      channel(actions.fetch.failure({ error }));
      log.warning(
        "polling ClickHouse users failed (retrying in 15s): %s",
        error
      );
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
