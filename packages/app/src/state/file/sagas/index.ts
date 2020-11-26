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
  spawn,
  call,
  select,
  delay,
  putResolve,
  takeEvery
} from "redux-saga/effects";
import subscriptionManager from "./subscription";
import * as actions from "../actions";
import { State } from "state/reducer";
import getPossiblyForkedFilesForModuleVersion from "../utils/possiblyForkedFiles";
import { getBranchTypescriptFiles } from "../hooks/useFiles";
import { makeVersionsForModuleSelector } from "state/moduleVersion/hooks/useModuleVersions";
import navigateToFile from "../utils/navigation";
import { sanitizeFilePath, sanitizeScope } from "state/utils/sanitize";
import { getCurrentBranch } from "state/branch/hooks/useBranches";

// function* checkNeedToRebaseOpenFile() {
//   while (true) {
//     yield take(actions.set);

//     const state: State = yield select();
//   }
// }

function* fileOpenerRequestHandler() {
  yield takeEvery(actions.requestOpenFileWithParams, fileOpener);
}

function* fileOpener(
  action: ReturnType<typeof actions.requestOpenFileWithParams>
) {
  let loaded = false;
  while (!loaded) {
    // get latest state
    const state: State = yield select();
    const files = getBranchTypescriptFiles(state);
    const currentBranch = getCurrentBranch(state);

    if (files === undefined) {
      // loop until files have loaded
      yield delay(10);
      continue;
    } else {
      loaded = true;
    }

    const {
      selectedModuleName,
      selectedModuleScope,
      selectedModuleVersion,
      selectedFilePath
    } = action.payload.params;

    if (!files || !selectedModuleName || !selectedModuleVersion) {
      return;
    }
    const moduleVersions = makeVersionsForModuleSelector(
      selectedModuleName,
      selectedModuleScope || ""
    )(state);

    const latestMainVersion =
      moduleVersions && moduleVersions.length
        ? moduleVersions.find(v => v.branch_name === "main")
        : null;

    const moduleFiles = files.filter(
      f =>
        f.module_name === selectedModuleName &&
        f.module_scope === selectedModuleScope
    );

    const isNewModule = !latestMainVersion;

    const possiblyForkedFiles = getPossiblyForkedFilesForModuleVersion(
      moduleFiles,
      isNewModule,
      selectedModuleVersion,
      latestMainVersion?.version
    );

    const fileToOpen = possiblyForkedFiles.find(
      pff =>
        pff.file.module_name === selectedModuleName &&
        sanitizeScope(pff.file.module_scope) ===
          sanitizeScope(selectedModuleScope) &&
        pff.file.module_version === selectedModuleVersion &&
        sanitizeFilePath(pff.file.path) === sanitizeFilePath(selectedFilePath)
    );

    if (!fileToOpen) {
      console.error("file does not exist");
      // redirect home for now
      action.payload.history.push("/");
    } else {
      yield putResolve(actions.openFile(fileToOpen));
      navigateToFile(
        fileToOpen.file,
        action.payload.history,
        currentBranch?.name
      );
    }
  }
}

export default function* fileTaskManager() {
  const sagas = [subscriptionManager, fileOpenerRequestHandler];
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
