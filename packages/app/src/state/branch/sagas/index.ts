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
import { all, spawn, call, takeEvery, put, select } from "redux-saga/effects";
import subscriptionManager from "./subscription";
import * as actions from "../actions";
import graphqlClient from "state/clients/graphqlClient";
import navigateToBranch from "../utils/navigation";
import { State } from "state/reducer";
import { getOpenFileParams } from "state/file/hooks/useFiles";
import { requestOpenFileWithParams } from "state/file/actions";

export default function* branchTaskManager() {
  const sagas = [
    subscriptionManager,
    branchChangeListener,
    createBranchListener,
    deleteBranchListener
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

function* branchChangeListener() {
  yield takeEvery(actions.setCurrentBranch, changeBranch);
}

function* changeBranch(action: ReturnType<typeof actions.setCurrentBranch>) {
  const state: State = yield select();
  if (action.payload.name === state.branches.currentBranchName) {
    return;
  }

  navigateToBranch(action.payload.name, action.payload.history);
  const selectedFileParams = getOpenFileParams(state);
  if (
    !(
      selectedFileParams.requestedModuleName &&
      selectedFileParams.requestedModuleScope &&
      selectedFileParams.requestedFilePath
    )
  ) {
    // don't try to open the file on the new branch if we don't have a file open before switching branches.
    return;
  }
  yield put(
    requestOpenFileWithParams({
      history: action.payload.history,
      params: {
        selectedFilePath: selectedFileParams.requestedFilePath,
        selectedModuleName: selectedFileParams.requestedModuleName,
        selectedModuleScope: selectedFileParams.requestedModuleScope,
        selectedModuleVersion: "latest" // use latest because it will pick something that has the best chance of existing
      }
    })
  );
}

function* createBranchListener() {
  yield takeEvery(actions.createBranch, createBranch);
}

function* createBranch(action: ReturnType<typeof actions.createBranch>) {
  try {
    yield graphqlClient.CreateBranch({
      name: action.payload.name
    });
    navigateToBranch(action.payload.name, action.payload.history);
  } catch (err) {
    console.error(err);
  }
}

function* deleteBranchListener() {
  yield takeEvery(actions.deleteBranch, deleteBranch);
}

function* deleteBranch(action: ReturnType<typeof actions.deleteBranch>) {
  try {
    yield graphqlClient.DeleteBranch({
      name: action.payload.name
    });
  } catch (err) {
    console.error(err);
  }
}
