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
import { all, spawn, call, takeEvery, select } from "redux-saga/effects";
import subscriptionManager from "./subscription";
import * as actions from "../actions";
import navigateToFile from "state/file/utils/navigation";
import { getCurrentlySelectedFile } from "state/file/hooks/useFiles";
import { State } from "state/reducer";

function* listenForBranchChange() {
  yield takeEvery(actions.setCurrentBranch, handleBranchChange);
}

function* handleBranchChange(
  action: ReturnType<typeof actions.setCurrentBranch>
) {
  const state: State = yield select();
  const currentFile = getCurrentlySelectedFile(state);
  // update the url
  if (currentFile) {
    navigateToFile(
      currentFile.file,
      action.payload.history,
      action.payload.name
    );
  }
}

function* listenForBranchCreateRequest() {
  yield takeEvery(actions.createBranch.request, handleBranchCreateRequest);
}

function* handleBranchCreateRequest(
  action: ReturnType<typeof actions.createBranch.request>
) {
  const state: State = yield select();
  const currentFile = getCurrentlySelectedFile(state);
  // clone the files in the existing module
  if (currentFile) {
  }
}

export default function* branchTaskManager() {
  const sagas = [
    subscriptionManager,
    listenForBranchChange,
    listenForBranchCreateRequest
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
