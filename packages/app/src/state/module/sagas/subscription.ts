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
  takeEvery,
  call,
  take,
  fork,
  cancelled,
  cancel
} from "redux-saga/effects";
import { Task, eventChannel, EventChannel } from "redux-saga";
import { ActionType } from "typesafe-actions";
import {
  SubscribeToModulesSubscription,
  SubscribeToModulesDocument
} from "state/clients/graphqlClient";
import subscriptionClient from "state/clients/graphqlClient/subscriptionClient";
import * as actions from "../actions";
import { SubscriptionID } from "../types";

type Actions = ActionType<typeof actions>;

/**
 * moduleSubscriptionManager listens for subscribe and unsubscribe requests.
 *
 * There can only exist a single subscription at any given time.
 */

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

export default function* moduleSubscriptionManager() {
  let activeSubscription: Task | undefined;
  // track all subscribers so we only cancel the subscription
  // once everybody has unsubscribed
  const subscribers = new Set<SubscriptionID>();

  yield takeEvery(actions.subscribe, function* (
    action: ReturnType<typeof actions.subscribe>
  ) {
    // add to tracked subscribers
    subscribers.add(action.payload);

    if (activeSubscription) {
      // already subscribed
      return;
    }

    const channel = yield call(moduleSubscriptionEventChannel);

    // Fork the subscription task
    activeSubscription = yield fork(executeActionsChannel, channel);
  });

  yield takeEvery(actions.unsubscribe, function* (
    action: ReturnType<typeof actions.unsubscribe>
  ) {
    // remove from subscribers
    subscribers.delete(action.payload);
    // Cancel active subscription if there are no subscribers
    if (activeSubscription && subscribers.size === 0) {
      yield cancel(activeSubscription);
      activeSubscription = undefined;
    }
  });
}

/**
 * Execute the graphql subscription
 */
export function moduleSubscriptionEventChannel(): EventChannel<Actions> {
  return eventChannel(emitter => {
    const subscription = subscriptionClient
      .subscribe<SubscribeToModulesSubscription>({
        query: SubscribeToModulesDocument
      })
      .subscribe({
        next: res => {
          if (res.data?.module) {
            emitter(actions.set(res.data?.module));
          }
        }
      });

    return () => subscription.unsubscribe();
  });
}
