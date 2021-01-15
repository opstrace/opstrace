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
  cancelled,
  cancel
} from "redux-saga/effects";
import { Task, eventChannel, EventChannel } from "redux-saga";
import { ActionType } from "typesafe-actions";
import {
  SubscribeToBranchFilesSubscription,
  SubscribeToBranchFilesDocument
} from "state/clients/graphqlClient";
import subscriptionClient from "state/clients/graphqlClient/subscriptionClient";
import * as actions from "../actions";
import { SubscriptionID } from "../types";

type Actions = ActionType<typeof actions>;

/**
 * fileSubscriptionManager listens for subscribe and unsubscribe requests.
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

function getSubId({
  branch,
  subId
}: {
  branch: string;
  subId: SubscriptionID;
}): string {
  return `${branch}|${subId}`;
}

export default function* fileSubscriptionManager() {
  let activeSubscriptions: Map<string, Task> = new Map();
  // track all subscribers so we only cancel the subscription
  // once everybody has unsubscribed
  const subscribers = new Set<string>();

  yield takeEvery(actions.subscribe, function* (
    action: ReturnType<typeof actions.subscribe>
  ) {
    // add to tracked subscribers
    subscribers.add(getSubId(action.payload));

    if (activeSubscriptions.get(action.payload.branch)) {
      // already subscribed
      return;
    }

    const channel = yield call(
      fileSubscriptionEventChannel,
      action.payload.branch
    );

    // Fork the subscription task
    activeSubscriptions.set(
      action.payload.branch,
      yield fork(executeActionsChannel, channel)
    );
  });

  yield takeEvery(actions.unsubscribe, function* (
    action: ReturnType<typeof actions.unsubscribe>
  ) {
    // remove from subscribers
    subscribers.delete(getSubId(action.payload));
    // Cancel active subscription if there are no subscribers
    const activeSubscription = activeSubscriptions.get(action.payload.branch);
    if (
      activeSubscription &&
      [...subscribers].filter(s => s.startsWith(action.payload.branch))
        .length === 0
    ) {
      yield cancel(activeSubscription);
      activeSubscriptions.delete(action.payload.branch);
    }
  });
}

/**
 * Execute the graphql subscription
 */
export function fileSubscriptionEventChannel(
  branch: string
): EventChannel<Actions> {
  return eventChannel(emitter => {
    const subscription = subscriptionClient
      .subscribe<SubscribeToBranchFilesSubscription>({
        query: SubscribeToBranchFilesDocument,
        variables: {
          branch
        }
      })
      .subscribe({
        next: res => {
          if (res.data?.branch_by_pk?.files) {
            emitter(
              actions.set({ branch, files: res.data?.branch_by_pk?.files })
            );
          }
        }
      });

    return () => subscription.unsubscribe();
  });
}
