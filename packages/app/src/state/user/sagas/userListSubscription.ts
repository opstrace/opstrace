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
  cancel,
  fork,
  cancelled
} from "redux-saga/effects";
import { Task, eventChannel, EventChannel } from "redux-saga";
import { ActionType } from "typesafe-actions";
import {
  SubscribeToUserListSubscription,
  SubscribeToUserListDocument
} from "state/clients/graphqlClient";
import subscriptionClient from "state/clients/graphqlClient/subscriptionClient";
import * as actions from "../actions";
import { SubscriptionID } from "../types";

type Actions = ActionType<typeof actions>;

/**
 * userListSubscriptionManager listens for subscribe and unsubscribe requests.
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

export default function* userListSubscriptionManager() {
  let activeSubscription: Task | undefined;
  // track all subscribers so we only cancel the subscription
  // once everybody has unsubscribed
  const subscribers = new Set<SubscriptionID>();

  yield takeEvery(
    actions.subscribeToUserList,
    function* (action: ReturnType<typeof actions.subscribeToUserList>) {
      if (process.env.RUNTIME === "sandbox") {
        return;
      }
      // add to tracked subscribers
      subscribers.add(action.payload);

      if (activeSubscription) {
        // already subscribed
        return;
      }

      const channel = yield call(userListSubscriptionEventChannel);

      // Fork the subscription task
      activeSubscription = yield fork(executeActionsChannel, channel);
    }
  );

  yield takeEvery(
    actions.unsubscribeFromUserList,
    function* (action: ReturnType<typeof actions.unsubscribeFromUserList>) {
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
export function userListSubscriptionEventChannel(): EventChannel<Actions> {
  return eventChannel(emitter => {
    const subscription = subscriptionClient
      .subscribe<SubscribeToUserListSubscription>({
        query: SubscribeToUserListDocument
      })
      .subscribe({
        next: res => {
          if (res.data?.user && res.data.user.length > 0) {
            emitter(actions.setUserList(res.data?.user));
          }
        }
      });

    return () => subscription.unsubscribe();
  });
}
