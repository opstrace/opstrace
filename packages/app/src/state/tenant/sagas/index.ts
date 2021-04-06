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
import * as yamlParser from "js-yaml";

import * as actions from "../actions";
import graphqlClient from "state/clients/graphqlClient";

import tenantListSubscriptionManager from "./tenantListSubscription";

export default function* tenantTaskManager() {
  const sagas = [
    tenantListSubscriptionManager,
    addTenantListener,
    deleteTenantListener,
    getAlertmanagerListener,
    updateAlertmanagerListener
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

function* getAlertmanagerListener() {
  yield takeEvery(actions.getAlertmanager, getAlertmanager);
}

function* getAlertmanager(action: ReturnType<typeof actions.getAlertmanager>) {
  try {
    const response = yield graphqlClient.GetAlertmanager({
      tenant_id: action.payload
    });

    if (response.data?.getAlertmanager?.config) {
      const cortexConfig = yamlParser.load(
        response.data?.getAlertmanager?.config,
        {
          schema: yamlParser.JSON_SCHEMA
        }
      );

      const templates = yamlParser.dump(cortexConfig.template_files, {
        schema: yamlParser.JSON_SCHEMA,
        lineWidth: -1
      });

      yield put({
        type: "ALERTMANAGER_LOADED",
        payload: {
          tenantId: action.payload,
          templates: templates,
          config: cortexConfig.alertmanager_config,
          online: true
        }
      });
    } else {
      const defaultTemplate = `default_template: |\n  '{{ define "__alertmanager" }}AlertManager{{ end }}\n  {{ define "__alertmanagerURL" }}{{ .ExternalURL }}/#/alerts?receiver={{ .Receiver | urlquery }}{{ end }}'`;

      yield put({
        type: "ALERTMANAGER_LOADED",
        payload: {
          tenantId: action.payload,
          templates: defaultTemplate,
          config: "",
          online: true
        }
      });
    }
  } catch (err) {
    console.error(err);
  }
}

function* updateAlertmanagerListener() {
  yield takeEvery(actions.updateAlertmanager, updateAlertmanager);
}

function* updateAlertmanager(
  action: ReturnType<typeof actions.updateAlertmanager>
) {
  try {
    if (action.payload.formId) {
      yield put({
        type: "UPDATE_FORM_STATUS",
        payload: {
          id: action.payload.formId,
          status: "validating"
        }
      });
    }

    const templates = yamlParser.load(action.payload.templates, {
      schema: yamlParser.JSON_SCHEMA
    });

    const config = yamlParser.dump(
      { template_files: templates, alertmanager_config: action.payload.config },
      {
        schema: yamlParser.JSON_SCHEMA,
        lineWidth: -1
      }
    );

    const response = yield graphqlClient.UpdateAlertmanager({
      tenant_id: action.payload.tenantId,
      input: { config }
    });

    if (action.payload.formId) {
      yield put({
        type: "UPDATE_FORM",
        payload: {
          id: action.payload.formId,
          status: "active",
          data: { remoteValidation: response.data.updateAlertmanager }
        }
      });
    }
  } catch (err) {
    console.error(err);
  }
}
