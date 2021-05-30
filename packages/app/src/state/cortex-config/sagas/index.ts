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
import { all, call, spawn, takeEvery, put } from "redux-saga/effects";
import axios from "axios";
import yaml from "js-yaml";
import { ServerError } from "server/errors";

import * as actions from "../actions";

import userListSubscriptionManager from "./cortexConfigSubscription";

export default function* userTaskManager() {
  const sagas = [userListSubscriptionManager, saveRuntimeConfigListener];
  // technique to keep the root alive and spawn sagas into their
  // own retry-on-failure loop.
  // https://redux-saga.js.org/docs/advanced/RootSaga.html
  yield all(
    sagas.map(saga =>
      spawn(function* () {
        while (true) {
          try {
            yield call(saga);
            break;
          } catch (e) {
            console.error(e);
          }
        }
      })
    )
  );
}

function* saveRuntimeConfigListener() {
  yield takeEvery(actions.saveCortexRuntimeConfig, saveRuntimeConfig);
}

function* saveRuntimeConfig(
  action: ReturnType<typeof actions.saveCortexRuntimeConfig>
) {
  try {
    yield axios.request({
      method: "POST",
      url: "/_/cortex/runtime_config",
      headers: {
        "Content-Type": "text/plain"
      },
      data: yaml.dump(action.payload)
    });
  } catch (err) {
    if (ServerError.isInstance(err.response.data)) {
      // Extract the specific error message
      yield put(
        actions.saveCortexRuntimeConfigError(err.response.data.message)
      );
    } else {
      yield put(actions.saveCortexRuntimeConfigError(err.toString()));
    }
  }
}
