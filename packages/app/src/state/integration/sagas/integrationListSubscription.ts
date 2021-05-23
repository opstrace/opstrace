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
import {
  put,
  call,
  take,
  takeEvery,
  fork,
  cancel,
  cancelled
} from "redux-saga/effects";
import { Task, eventChannel, EventChannel } from "redux-saga";
import { ActionType } from "typesafe-actions";
import {
  SubscribeToIntegrationListSubscription,
  SubscribeToIntegrationListDocument
} from "state/clients/graphqlClient";
import subscriptionClient from "state/clients/graphqlClient/subscriptionClient";
import * as actions from "../actions";
import { SubscriptionID } from "../types";

type Actions = ActionType<typeof actions>;

export function* executeActionsChannel(channel: any) {
  // create a local reference inside the fork
  const chan = channel;

  try {
    while (true) {
      // pull next from channel
      const action: Actions = yield take(chan);
      // dispatch action
      yield put(action);
    }
  } finally {
    // If task cancelled, close the channel
    if (yield cancelled()) {
      chan.close();
    }
  }
}

/**
 * integrationListSubscriptionManager listens for subscribe and unsubscribe requests.
 *
 * There can only exist a single subscription at any given time.
 */
export default function* integrationListSubscriptionManager() {
  let activeSubscription: Task | undefined;
  let currentTenant: string | undefined;
  // track all subscribers so we only cancel the subscription
  // once everybody has unsubscribed
  const subscribers = new Set<SubscriptionID>();

  yield takeEvery(
    actions.subscribeToIntegrationList,
    function* (action: ReturnType<typeof actions.subscribeToIntegrationList>) {
      // Cancel any existing subscription if tenant changed
      if (currentTenant !== action.payload.tenant && activeSubscription) {
        yield cancel(activeSubscription);
        activeSubscription = undefined;
        subscribers.clear();
      }
      currentTenant = action.payload.tenant;
      // add to tracked subscribers
      subscribers.add(action.payload.subId);

      if (activeSubscription) {
        // already subscribed
        return;
      }

      const channel = yield call(
        integrationListSubscriptionEventChannel(action.payload.tenant)
      );

      // Fork the subscription task
      activeSubscription = yield fork(executeActionsChannel, channel);
    }
  );

  yield takeEvery(
    actions.unsubscribeFromIntegrationList,
    function* (
      action: ReturnType<typeof actions.unsubscribeFromIntegrationList>
    ) {
      // remove from subscribers
      subscribers.delete(action.payload.subId);
      // Cancel active subscription if there are no subscribers
      if (activeSubscription && subscribers.size === 0) {
        yield cancel(activeSubscription);
        // Reset list
        yield put(actions.setIntegrationList([]));
        activeSubscription = undefined;
      }
    }
  );
}

/**
 * Execute the graphql subscription
 */
export function integrationListSubscriptionEventChannel(tenantName: string) {
  return function (): EventChannel<Actions> {
    return eventChannel(emitter => {
      const subscription = subscriptionClient
        .subscribe<SubscribeToIntegrationListSubscription>({
          query: SubscribeToIntegrationListDocument,
          variables: {
            tenant_name: tenantName
          }
        })
        .subscribe({
          next: res => {
            if (res.data?.tenant_by_pk?.integrations) {
              emitter(
                actions.setIntegrationList(res.data.tenant_by_pk.integrations)
              );
            }
          }
        });

      return () => subscription.unsubscribe();
    });
  };
}
