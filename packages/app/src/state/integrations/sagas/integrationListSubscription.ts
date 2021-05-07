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
import { SubscriptionId } from "../types";

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
  // track all subscribers so we only cancel the subscription
  // once everybody has unsubscribed
  const subscribers = new Set<SubscriptionId>();

  yield takeEvery(
    actions.subscribeToIntegrationList,
    function* (action: ReturnType<typeof actions.subscribeToIntegrationList>) {
      // add to tracked subscribers
      subscribers.add(action.payload);

      if (activeSubscription) {
        // already subscribed
        return;
      }

      const channel = yield call(integrationListSubscriptionEventChannel);

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
      subscribers.delete(action.payload);
      // Cancel active subscription if there are no subscribers
      if (activeSubscription && subscribers.size === 0) {
        yield cancel(activeSubscription);
        activeSubscription = undefined;
      }
    }
  );
}

/**
 * Execute the graphql subscription
 */
export function integrationListSubscriptionEventChannel(): EventChannel<Actions> {
  return eventChannel(emitter => {
    const subscription = subscriptionClient
      .subscribe<SubscribeToIntegrationListSubscription>({
        query: SubscribeToIntegrationListDocument
      })
      .subscribe({
        next: res => {
          if (res.data?.integration && res.data.integration.length > 0) {
            emitter(actions.setIntegrationList(res.data?.integration));
          }
        }
      });

    return () => subscription.unsubscribe();
  });
}
