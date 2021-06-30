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
import axios from "axios";
import { Task, eventChannel, EventChannel } from "redux-saga";
import { ActionType } from "typesafe-actions";

import * as actions from "../actions";
import { SubscriptionID } from "../types";
import {
  validateAndExtractRuntimeConfig,
  validateCortexConfig
} from "../utils";
import { ServerError } from "server/errors";

type Actions = ActionType<typeof actions>;

/**
 * cortexConfigSubscriptionManager listens for subscribe and unsubscribe requests.
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
    //@ts-ignore: TS7075 generator lacks return type (TS 4.3)
    if (yield cancelled()) {
      chan.close();
    }
  }
}

export default function* cortexConfigSubscriptionManager() {
  let activeSubscription: Task | undefined;
  // track all subscribers so we only cancel the subscription
  // once everybody has unsubscribed
  const subscribers = new Set<SubscriptionID>();

  yield takeEvery(
    actions.subscribeToCortexConfig,
    function* (action: ReturnType<typeof actions.subscribeToCortexConfig>) {
      // add to tracked subscribers
      subscribers.add(action.payload);

      if (activeSubscription) {
        // already subscribed
        return;
      }

      //@ts-ignore: TS7075 generator lacks return type (TS 4.3)
      const channel = yield call(cortexConfigSubscriptionEventChannel);

      // Fork the subscription task
      activeSubscription = yield fork(executeActionsChannel, channel);
    }
  );

  yield takeEvery(
    actions.unsubscribeFromCortexConfig,
    function* (action: ReturnType<typeof actions.unsubscribeFromCortexConfig>) {
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
export function cortexConfigSubscriptionEventChannel(): EventChannel<Actions> {
  return eventChannel(emitter => {
    function fetchConfigs() {
      try {
        // Load runtime_config from file
        axios
          .get("/_/cortex/runtime_config_file")
          .then(async res => {
            // This API returns the validated runtime config json already
            emitter(actions.setCortexRuntimeConfig(res.data));
          })
          .catch(err => {
            if (ServerError.isInstance(err.response.data)) {
              // Extract the specific error message
              emitter(actions.setCortexConfigError(err.response.data.message));
            } else {
              emitter(actions.setCortexConfigError(err.toString()));
            }
          });
        // Load runtime_config as recognized by Cortex
        axios
          .get("/_/cortex/runtime_config")
          .then(async res => {
            // Validate the returned data to throw if expected config is broken.
            // Cortex may have changed the underlying limits configuration
            const data = await validateAndExtractRuntimeConfig(res.data);
            emitter(actions.setRecognizedCortexRuntimeConfig(data));
          })
          .catch(err => {
            if (ServerError.isInstance(err.response.data)) {
              // Extract the specific error message
              emitter(actions.setCortexConfigError(err.response.data.message));
            } else {
              emitter(actions.setCortexConfigError(err.toString()));
            }
          });
        // Get base config
        axios
          .get("/_/cortex/config")
          .then(async res => {
            // Validate the returned data to throw if expected config is broken.
            // Cortex may have changed the underlying limits configuration
            const data = await validateCortexConfig(res.data);
            emitter(actions.setCortexConfig(data));
          })
          .catch(err => {
            if (ServerError.isInstance(err.response.data)) {
              // Extract the specific error message
              emitter(actions.setCortexConfigError(err.response.data.message));
            } else {
              emitter(actions.setCortexConfigError(err.toString()));
            }
          });
      } catch (err) {
        emitter(actions.setCortexConfigError(err.toString()));
      }
    }
    fetchConfigs();

    const timer = setInterval(fetchConfigs, 5000);

    return () => clearInterval(timer);
  });
}
