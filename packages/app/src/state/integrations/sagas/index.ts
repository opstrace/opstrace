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

import { all, call, spawn, takeEvery, put } from "redux-saga/effects";

import * as actions from "../actions";
import graphqlClient from "state/clients/graphqlClient";

import integrationListSubscriptionManager from "./integrationListSubscription";

export default function* integrationTaskManager() {
  const sagas = [
    integrationListSubscriptionManager,
    addIntegrationListener,
    deleteIntegrationListener
  ];
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

function* addIntegrationListener() {
  yield takeEvery(actions.addIntegration, addIntegration);
}

function* addIntegration(action: ReturnType<typeof actions.addIntegration>) {
  try {
    yield graphqlClient.CreateIntegrations({
      integrations: [
        {
          name: action.payload
        }
      ]
    });
  } catch (err) {
    console.error(err);
  }
}

function* deleteIntegrationListener() {
  yield takeEvery(actions.deleteIntegration, deleteIntegration);
}

function* deleteIntegration(
  action: ReturnType<typeof actions.deleteIntegration>
) {
  try {
    yield graphqlClient.DeleteIntegration({
      name: action.payload
    });
  } catch (err) {
    console.error(err);
  }
}
