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

export default function* tenantTaskManager() {
  const sagas = [
    tenantListSubscriptionManager,
    addTenantListener,
    deleteTenantListener,
    getAlertmanagerListener,
    updateAlertmanager
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

const ALERTMANAGER_CONFIG_CORTEX_HEADER = `
template_files:\n\tdefault_template: |\n\t\t{{ define "__alertmanager" }}AlertManager{{ end }}\n\t\t{{ define "__alertmanagerURL" }}{{ .ExternalURL }}/#/alerts?receiver={{ .Receiver | urlquery }}{{ end }}\nalertmanager_config: |`;

function* getAlertmanagerListener() {
  yield takeEvery(actions.getAlertmanager, getAlertmanager);
}
function* getAlertmanager(action: ReturnType<typeof actions.getAlertmanager>) {
  try {
    const response = yield graphqlClient.GetAlertmanager({
      tenant_id: action.payload
    });

    const prometheusConfig = response.data?.tenant_by_pk?.alertmanager_config
      .replace(ALERTMANAGER_CONFIG_CORTEX_HEADER, "")
      .replace("\n\t", "") // replace leading set with nothing as we don't want a blank line at the begining of the config
      .replace(/(\n\t)+/g, "\n");

    if (response.data?.tenant_by_pk?.alertmanager_config)
      yield put({
        type: "ALERTMANAGER_LOADED",
        payload: {
          tenantId: action.payload,
          config: prometheusConfig,
          online: true
        }
      });
  } catch (err) {
    console.error(err);
  }
}

function* updateAlertmanager() {
  while (true) {
    const action: ReturnType<typeof actions.updateAlertmanager> = yield take(
      actions.updateAlertmanager
    );

    const cortexConfig = `${ALERTMANAGER_CONFIG_CORTEX_HEADER}\n\t${action.payload.config.replace(
      /(\n)+/g,
      "\n\t"
    )}`;

    try {
      yield graphqlClient.UpdateAlertmanager({
        tenant_id: action.payload.tenantId,
        input: { config: cortexConfig }
      });
    } catch (err) {
      console.error(err);
    }
  }
}
