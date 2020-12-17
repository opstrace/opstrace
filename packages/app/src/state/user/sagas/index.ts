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
import { all, select, take, call, spawn, takeEvery } from "redux-saga/effects";
import * as actions from "../actions";
import graphqlClient, { User } from "state/graphqlClient";

import userListSubscriptionManager from "./userListSubscription";
import { getCurrentUser } from "../hooks/useCurrentUser";

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
    yield graphqlClient.CreateUser({
      email: action.payload,
      avatar: "",
      // set the email as the username for now, it'll be overwritten
      // when the user logs in for the first time
      username: action.payload
    });
  } catch (err) {
    console.error(err);
  }
}

function* deleteUserListener() {
  yield takeEvery(actions.deleteUser, deleteUser);
}

function* deleteUser(action: ReturnType<typeof actions.deleteUser>) {
  try {
    yield graphqlClient.DeleteUser({
      email: action.payload
    });
  } catch (err) {
    console.error(err);
  }
}

function* persistDarkModePreference() {
  while (true) {
    const action: ReturnType<typeof actions.setDarkMode> = yield take(
      actions.setDarkMode
    );
    const user: User | undefined = yield select(getCurrentUser);
    if (!user?.email) {
      return;
    }
    try {
      yield graphqlClient.SetDarkMode({
        email: user.email,
        darkMode: action.payload
      });
    } catch (err) {
      console.error(err);
    }
  }
}
