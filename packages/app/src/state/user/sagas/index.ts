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
  all,
  select,
  take,
  call,
  spawn,
  takeEvery,
  put
} from "redux-saga/effects";
import axios from "axios";

import * as actions from "../actions";
import graphqlClient, { User } from "state/clients/graphqlClient";

import userListSubscriptionManager from "./userListSubscription";
import { getCurrentUser } from "../hooks/useCurrentUser";
import { State } from "state/reducer";
import { getUserList } from "../hooks/useUserList";
import { Tenants } from "state/tenant/types";
import { selectTenantList } from "state/tenant/hooks/useTenantList";
import { grafanaUrl } from "client/utils/grafana";

export default function* userTaskManager() {
  const sagas = [
    userListSubscriptionManager,
    persistDarkModePreference,
    addUserListener,
    deleteUserListener
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

function* addUserListener() {
  yield takeEvery(actions.addUser, addUser);
}

function* addUser(action: ReturnType<typeof actions.addUser>) {
  try {
    const state: State = yield select();
    const registeredUsers = getUserList(state, { includeInactive: true });
    const existingDeactivatedUser = registeredUsers.find(
      user => user.email === action.payload && !user.active
    );

    // We set users as inactive instead of deleting so that all the history
    // created by them is not disrupted/lost
    if (existingDeactivatedUser) {
      yield graphqlClient.ReactivateUser({
        id: existingDeactivatedUser.id
      });
    } else {
      yield graphqlClient.CreateUser({
        email: action.payload,
        avatar: "",
        // set the email as the username for now, it'll be overwritten
        // when the user logs in for the first time
        username: action.payload
      });
    }
  } catch (err) {
    console.error(err);
  }
}

function* deleteUserListener() {
  yield takeEvery(actions.deleteUser, deleteUser);
}

function* deleteUser(action: ReturnType<typeof actions.deleteUser>) {
  try {
    // When we "delete" a user, we actually set the user as inactive instead of deleting so that all the history
    // created by them is not disrupted/lost
    yield graphqlClient.DeactivateUser({
      id: action.payload
    });
  } catch (err) {
    console.error(err);
  }
}

function* persistDarkModePreference() {
  while (true) {
    const action: ReturnType<typeof actions.requestSetDarkMode> = yield take(
      actions.requestSetDarkMode
    );
    const user: User | undefined = yield select(getCurrentUser);
    if (!user?.id) {
      return;
    }
    const tenants: Tenants = yield select(selectTenantList);
    try {
      // First update Grafana instances
      yield Promise.all(
        tenants.map(tenant =>
          axios({
            method: "put",
            url: `${grafanaUrl({ tenant })}/grafana/api/user/preferences`,
            withCredentials: true,
            data: {
              homeDashboardId: 0,
              theme: action.payload ? "dark" : "light",
              timezone: ""
            }
          })
        )
      );
    } catch (err) {
      console.error(err);
    }
    try {
      yield put(actions.setDarkMode(action.payload));
      yield graphqlClient.SetDarkMode({
        user_id: user.id,
        dark_mode: action.payload
      });
    } catch (err) {
      console.error(err);
    }
  }
}
