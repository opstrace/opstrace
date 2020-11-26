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
import { put, call, take, fork, cancelled, cancel } from "redux-saga/effects";
import { Task, eventChannel, EventChannel } from "redux-saga";
import { ActionType } from "typesafe-actions";
import {
  SubscribeToModuleVersionsSubscription,
  SubscribeToModuleVersionsDocument
} from "state/graphqlClient";
import subscriptionClient from "state/graphqlClient/subscriptionClient";
import * as actions from "../actions";
import { SubscriptionID } from "../types";

type Actions = ActionType<typeof actions>;

/**
 * moduleVersionsSubscriptionManager listens for subscribe and unsubscribe requests.
 *
 * There can only exist a single subscription at any given time.
 */
export default function* moduleVersionsSubscriptionManager() {
  let activeSubscription: Task | undefined;
  // track all subscribers so we only cancel the subscription
  // once everybody has unsubscribed
  const subscribers = new Set<SubscriptionID>();

  // Fork a subscribe handler
  yield fork(function* () {
    while (true) {
      // wait for a subscribe action
      const action: ReturnType<typeof actions.subscribe> = yield take(
        actions.subscribe
      );
      // add to tracked subscribers
      subscribers.add(action.payload);

      if (activeSubscription) {
        // already subscribed
        return;
      }

      const channel = yield call(moduleSubscriptionEventChannel);

      // Fork the subscription task
      activeSubscription = yield fork(function* () {
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
      });
    }
  });

  // Fork an unsubscribe handler
  yield fork(function* () {
    while (true) {
      // wait for the unsubscribe action and then cancel the subscription task
      const action: ReturnType<typeof actions.unsubscribe> = yield take(
        actions.unsubscribe
      );
      // remove from subscribers
      subscribers.delete(action.payload);
      // Cancel active subscription if there are no subscribers
      if (activeSubscription && subscribers.size === 0) {
        yield cancel(activeSubscription);
        activeSubscription = undefined;
      }
    }
  });
}

/**
 * Execute the graphql subscription
 */
export function moduleSubscriptionEventChannel(): EventChannel<Actions> {
  return eventChannel(emitter => {
    const subscription = subscriptionClient
      .subscribe<SubscribeToModuleVersionsSubscription>({
        query: SubscribeToModuleVersionsDocument
      })
      .subscribe({
        next: res => {
          if (res.data?.module_version) {
            emitter(actions.set(res.data?.module_version));
          }
        }
      });

    return () => subscription.unsubscribe();
  });
}
