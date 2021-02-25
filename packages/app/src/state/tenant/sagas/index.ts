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
import { all, call, spawn, takeEvery, take, put } from "redux-saga/effects";
import * as actions from "../actions";
import graphqlClient from "state/clients/graphqlClient";

import tenantListSubscriptionManager from "./tenantListSubscription";
// import { selectAlertmanagerConfig } from "state/tenant/hooks/useAlertmanagerConfig";

export default function* tenantTaskManager() {
  const sagas = [
    tenantListSubscriptionManager,
    addTenantListener,
    deleteTenantListener,
    loadAlertmanagerConfigListener,
    saveAlertmanagerConfig
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

function* addTenantListener() {
  yield takeEvery(actions.addTenant, addTenant);
}

function* addTenant(action: ReturnType<typeof actions.addTenant>) {
  try {
    yield graphqlClient.CreateTenants({
      tenants: [
        {
          name: action.payload
        }
      ]
    });
  } catch (err) {
    console.error(err);
  }
}

function* deleteTenantListener() {
  yield takeEvery(actions.deleteTenant, deleteTenant);
}

function* deleteTenant(action: ReturnType<typeof actions.deleteTenant>) {
  try {
    yield graphqlClient.DeleteTenant({
      name: action.payload
    });
  } catch (err) {
    console.error(err);
  }
}

function* loadAlertmanagerConfigListener() {
  yield takeEvery(actions.loadAlertmanagerConfig, loadAlertmanagerConfig);
}

function* loadAlertmanagerConfig(
  action: ReturnType<typeof actions.loadAlertmanagerConfig>
) {
  try {
    const response = yield graphqlClient.LoadAlertmanagerConfig({
      tenant_name: action.payload
    });

    if (response.data?.tenant_by_pk?.alertmanager_config)
      yield put({
        type: "ALERTMANAGER_CONFIG_LOADED",
        payload: {
          tenantName: action.payload,
          config: response.data?.tenant_by_pk?.alertmanager_config
        }
      });
  } catch (err) {
    console.error(err);
  }
}

function* saveAlertmanagerConfig() {
  while (true) {
    const action: ReturnType<
      typeof actions.saveAlertmanagerConfig
    > = yield take(actions.saveAlertmanagerConfig);

    try {
      yield graphqlClient.SaveAlertmanagerConfig({
        tenant_name: action.payload.tenantName,
        new_config: action.payload.config
      });
    } catch (err) {
      console.error(err);
    }
  }
}
