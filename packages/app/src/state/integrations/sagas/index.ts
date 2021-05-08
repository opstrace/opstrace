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

import { all, call, spawn, takeEvery } from "redux-saga/effects";

import * as actions from "../actions";
import graphqlClient from "state/clients/graphqlClient";

export default function* integrationTaskManager() {
  const sagas = [insertIntegrationListener, deleteIntegrationListener];
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

function* insertIntegrationListener() {
  yield takeEvery(actions.insertIntegration, insertIntegration);
}

function* insertIntegration(
  action: ReturnType<typeof actions.insertIntegration>
) {
  try {
    yield graphqlClient.InsertIntegrations({
      integrations: [
        {
          tenant_id: action.payload.tenantId,
          kind: action.payload.kind,
          name: action.payload.name
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
      tenant_id: action.payload.tenantId,
      id: action.payload.id
    });
  } catch (err) {
    console.error(err);
  }
}
