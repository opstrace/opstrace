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

import { all, call, spawn, takeEvery, select } from "redux-saga/effects"; // put

import * as actions from "../actions";
import integrationListSubscriptionManager from "./integrationListSubscription";

import { selectIntegration } from "state/integration/hooks/useIntegration";

export default function* integrationTaskManager() {
  const sagas = [
    integrationListSubscriptionManager,
    loadGrafanaStateForIntegrationListener
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

function* loadGrafanaStateForIntegrationListener() {
  yield takeEvery(
    actions.loadGrafanaStateForIntegration,
    loadGrafanaStateForIntegration
  );
}

function* loadGrafanaStateForIntegration(
  action: ReturnType<typeof actions.loadGrafanaStateForIntegration>
) {
  try {
    const integration = yield select(selectIntegration, action.payload.id);
    console.log("saga", integration.tenant.name, integration);

    // const response: AsyncReturnType<
    //   typeof graphqlClient.GetAlertmanager
    // > = yield graphqlClient.GetAlertmanager({
    //   tenant_id: action.payload
    // });
    // if (response.data?.loadGrafanaStateForIntegration?.config) {
    //   const cortexConfig = yamlParser.load(
    //     response.data?.loadGrafanaStateForIntegration?.config,
    //     {
    //       schema: yamlParser.JSON_SCHEMA
    //     }
    //   );
    //   yield put(
    //     actions.alertmanagerLoaded({
    //       tenantName: action.payload,
    //       config: cortexConfig.alertmanager_config,
    //       online: true
    //     })
    //   );
    // } else {
    //   yield put(
    //     actions.alertmanagerLoaded({
    //       tenantName: action.payload,
    //       config: "",
    //       online: true
    //     })
    //   );
    // }
  } catch (err) {
    console.error(err);
  }
}
