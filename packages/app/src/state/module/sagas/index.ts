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
import { all, spawn, call, takeEvery, select, put } from "redux-saga/effects";
import subscriptionManager from "./subscription";
import * as actions from "../actions";
import { State } from "state/reducer";
import { requestOpenFileWithParams } from "state/file/actions";
import graphqlClient from "state/clients/graphqlClient";

export default function* moduleTaskManager() {
  const sagas = [subscriptionManager, createModuleListener];

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

function* createModuleListener() {
  yield takeEvery(actions.createModule, createModule);
}

function* createModule(action: ReturnType<typeof actions.createModule>) {
  try {
    const state: State = yield select();
    const scope = "";
    const branch = state.branches.currentBranchName;
    const name = action.payload.name;
    const initialfileVersion = "0.0.1";
    const mainFileContents = `/**
* ###################
* 
* Main ⬇️
* 
* ###################
*/

// Always export a default function
export default function main() {
  return "I'm new";
}
`;

    yield call(graphqlClient.CreateModule, {
      name,
      scope,
      branch,
      version: initialfileVersion,
      files: [
        {
          path: "main",
          module_version: "latest",
          branch_name: branch,
          module_name: name,
          module_scope: scope,
          contents: mainFileContents
        },
        {
          path: "main",
          module_version: initialfileVersion,
          branch_name: branch,
          module_name: name,
          module_scope: scope,
          contents: mainFileContents
        }
      ]
    });
    yield put(
      requestOpenFileWithParams({
        history: action.payload.history,
        params: {
          selectedFilePath: "main",
          selectedModuleName: action.payload.name,
          selectedModuleScope: scope,
          selectedModuleVersion: "latest"
        }
      })
    );
  } catch (err) {
    console.error(err);
  }
}
