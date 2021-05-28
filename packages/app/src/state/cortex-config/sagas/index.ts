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
import { all, select, call, spawn, takeEvery, put } from "redux-saga/effects";
// import axios from "axios";

import * as actions from "../actions";

import userListSubscriptionManager from "./cortexConfigSubscription";
import { State } from "state/reducer";

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
    const state: State = yield select();
    console.log(state);
  } catch (err) {
    yield put(actions.setCortexConfigError(err.toString()));
    console.error(err);
  }
}
