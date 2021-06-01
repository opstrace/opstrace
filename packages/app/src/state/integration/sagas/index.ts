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

import { all, call, spawn, takeEvery, select, put } from "redux-saga/effects"; // put

import * as actions from "../actions";
import integrationListSubscriptionManager from "./integrationListSubscription";

import { selectIntegration } from "state/integration/hooks/useIntegration";
import { selectTenantById } from "state/tenant/hooks/useTenant";

import { Integration } from "state/integration/types";
import { Tenant } from "state/tenant/types";

import { getFolder } from "client/utils/grafana";

// create a generic type
type AsyncReturnType<T extends (...args: any) => any> =
  // if T matches this signature and returns a Promise, extract
  // U (the type of the resolved promise) and use that, or...
  T extends (...args: any) => Promise<infer U>
    ? U // if T matches this signature and returns anything else, // extract the return value U and use that, or...
    : T extends (...args: any) => infer U
    ? U // if everything goes to hell, return an `any`
    : any;

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
    const integration: Integration = yield select(
      selectIntegration,
      action.payload.id
    );

    const tenant: Tenant = yield select(
      selectTenantById,
      integration.tenant_id
    );

    const folderResponse: AsyncReturnType<typeof getFolder> = yield getFolder({
      integration,
      tenant
    });

    yield put(
      actions.updateGrafanaStateForIntegration({
        id: integration.id,
        grafana: {
          folder: folderResponse
        }
      })
    );
  } catch (err) {
    console.error(err);
  }
}
