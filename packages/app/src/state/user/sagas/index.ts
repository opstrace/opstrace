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
import { all, select, take, call, spawn } from "redux-saga/effects";
import * as actions from "../actions";
import graphqlClient from "state/graphqlClient";
import { State } from "state/reducer";

import currentUserSubscriptionManager from "./currentUserSubscription";
import userListSubscriptionManager from "./userListSubscription";

export default function* userTaskManager() {
  const sagas = [
    currentUserSubscriptionManager,
    userListSubscriptionManager,
    persistDarkModePreference,
    addUser,
    deleteUser
  ];
  // technique to keep the root alive and spawn sagas into their
  // own retry-on-failure loop.
  // https://redux-saga.js.org/docs/advanced/RootSaga.html
  yield all(
    sagas.map(saga =>
      spawn(function*() {
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

function* addUser() {
  while (true) {
    const action: ReturnType<typeof actions.addUser> = yield take(
      actions.addUser
    );
    try {
      yield graphqlClient.CreateUser({
        email: action.payload,
        avatar: "",
        username: action.payload
      });
    } catch (err) {
      console.error(err);
    }
  }
}

function* deleteUser() {
  while (true) {
    const action: ReturnType<typeof actions.deleteUser> = yield take(
      actions.deleteUser
    );
    try {
      yield graphqlClient.DeleteUser({
        email: action.payload
      });
    } catch (err) {
      console.error(err);
    }
  }
}

function* persistDarkModePreference() {
  while (true) {
    const action: ReturnType<typeof actions.setDarkMode> = yield take(
      actions.setDarkMode
    );
    const state: State = yield select();
    const email = state.users.currentUser?.email;
    if (!email) {
      return;
    }
    try {
      yield graphqlClient.SetDarkMode({ email, darkMode: action.payload });
    } catch (err) {
      console.error(err);
    }
  }
}
