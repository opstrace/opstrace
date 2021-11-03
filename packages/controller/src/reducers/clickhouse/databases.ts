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
    "FETCH_CLICKHOUSE_DBS_REQUEST",
    "FETCH_CLICKHOUSE_DBS_SUCCESS",
    "FETCH_CLICKHOUSE_DBS_FAILURE"
  )<Record<string, unknown>, { resources: string[] }, { error: Error }>()
};
export type ClickHouseDBActions = ActionType<typeof actions>;
export type ClickHouseDBState = ResourceCache<string[]>;

const initialState: ClickHouseDBState = {
  loaded: false,
  error: null,
  resources: []
};

export const reducer = createReducer<ClickHouseDBState, ClickHouseDBActions>(
  initialState
)
  .handleAction(
    actions.fetch.request,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (state, _): ClickHouseDBState => ({
      ...state,
      loaded: false
    })
  )
  .handleAction(
    actions.fetch.success,
    (state, action): ClickHouseDBState => ({
      ...state,
      ...action.payload,
      error: null,
      loaded: true
    })
  )
  .handleAction(
    actions.fetch.failure,
    (state, action): ClickHouseDBState => ({
      ...state,
      ...action.payload,
      loaded: false
    })
  );

// Response type for "SHOW DATABASES" command
interface DatabaseEntry {
  name: string;
}

export function startInformer(channel: (input: unknown) => void): () => void {
  let cancelled = false;
  //@ts-ignore: TS7023 'poll' implicitly has return type 'any'
  const poll = async () => {
    if (cancelled) {
      return;
    }
    if (!dbClient) {
      log.warning(
        "skipping ClickHouse database informer due to missing env var CLICKHOUSE_ENDPOINT"
      );
      return;
    }
    try {
      const dbs = await dbClient.query("SHOW DATABASES").toPromise();
      const dbNames = (dbs as DatabaseEntry[]).map(db => db.name);
      log.debug("ClickHouse dbs: %s", dbNames);
      channel(actions.fetch.success({ resources: dbNames }));
      // refresh in 3s
      return setTimeout(poll, 3000);
    } catch (error: any) {
      channel(actions.fetch.failure({ error }));
      log.warning(
        "polling ClickHouse databases failed (retrying in 15s): %s",
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
