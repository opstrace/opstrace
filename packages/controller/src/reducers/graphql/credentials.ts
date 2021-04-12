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
import {
  SubscribeToCredentialListSubscription,
  SubscribeToCredentialListDocument
} from "../../dbSDK";

import subscriptionClient, { Subscription } from "../../dbSubscriptionClient";

export interface Credential {
  name: string;
  tenant: string;
  type: string;
  value: string;
}
export type Credentials = Credential[];

const actions = {
  fetch: createAsyncAction(
    "FETCH_GRAPHQL_CREDENTIALS_REQUEST",
    "FETCH_GRAPHQL_CREDENTIALS_SUCCESS",
    "FETCH_GRAPHQL_CREDENTIALS_FAILURE"
  )<Record<string, unknown>, { resources: Credentials }, { error: Error }>()
};
export type CredentialActions = ActionType<typeof actions>;
export type CredentialState = ResourceCache<Credential>;

const initialState: CredentialState = {
  loaded: false,
  error: null,
  resources: []
};

export const reducer = createReducer<
  CredentialState,
  CredentialActions
>(initialState)
  .handleAction(
    actions.fetch.request,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (state, _): CredentialState => ({
      ...state,
      loaded: false
    })
  )
  .handleAction(
    actions.fetch.success,
    (state, action): CredentialState => ({
      ...state,
      ...action.payload,
      error: null,
      loaded: true
    })
  )
  .handleAction(
    actions.fetch.failure,
    (state, action): CredentialState => ({
      ...state,
      ...action.payload,
      loaded: false
    })
  );

export function startInformer(
  channel: (input: unknown) => void
): () => void {
  let cancelled = false;
  let subscription: Subscription;
  const watch = async () => {
    if (cancelled) {
      return;
    }
    if (!dbClient) {
      log.warning(
        "skipping credential sync due to missing env vars GRAPHQL_ENDPOINT & HASURA_GRAPHQL_ADMIN_SECRET"
      );
      return;
    }
    // Do initial load up-front
    try {
      const res = await dbClient.GetCredentialsDump();
      if (res.data?.credential && res.data.credential.length > 0) {
        channel(
          actions.fetch.success({
            resources: res.data?.credential
          })
        );
      }
    } catch (error) {
      channel(actions.fetch.failure({ error }));
      log.warning("starting credentials informer failed (will retry): %s", error);
      return setTimeout(watch, 3000);
    }
    if (!subscriptionClient) {
      log.warning(
        "skipping credential subscription due to missing env vars GRAPHQL_ENDPOINT & HASURA_GRAPHQL_ADMIN_SECRET"
      );
      return;
    }
    // Start subscription to future updates
    subscription = subscriptionClient
      .subscribe<SubscribeToCredentialListSubscription>({
        query: SubscribeToCredentialListDocument
      })
      .subscribe({
        next: res => {
          if (res.data?.credential) {
            channel(actions.fetch.success({
              resources: res.data.credential
            }));
          }
        }
      });
    return () => subscription.unsubscribe();
  };
  watch();
  // Return a function to disable the informer and close the request
  return () => {
    cancelled = true;
    subscription && subscription.unsubscribe();
  };
}
