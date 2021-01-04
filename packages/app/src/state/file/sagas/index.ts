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
  takeLatest,
  cancelled
} from "redux-saga/effects";
import isBefore from "date-fns/isBefore";
import addMilliseconds from "date-fns/addMilliseconds";
import subscriptionManager from "./subscription";
import * as actions from "../actions";
import { State } from "state/reducer";
import getPossiblyForkedFilesForModuleVersion from "../utils/possiblyForkedFiles";
import { getBranchTypescriptFiles } from "../hooks/useFiles";
import { makeSortedVersionsForModuleSelector } from "state/moduleVersion/hooks/useModuleVersions";
import navigateToFile from "../utils/navigation";
import { sanitizeFilePath, sanitizeScope } from "state/utils/sanitize";
import { getCurrentBranch } from "state/branch/hooks/useBranches";

// function* checkNeedToRebaseOpenFile() {
//   while (true) {
//     yield take(actions.set);

//     const state: State = yield select();
//   }
// }

// function* checkNeedToUpdateOpenFileAlias() {
//   while (true) {
//     yield take(actions.set);

//     const state: State = yield select();
//   }
// }

function* fileOpenerRequestHandler() {
  yield takeLatest(actions.requestOpenFileWithParams, fileOpener);
}

function* fileOpener(
  action: ReturnType<typeof actions.requestOpenFileWithParams>
) {
  try {
    // Because state is eventually consistent (i.e. upon a module or file creation event,
    // the client may not recieve all the latest state immediately), then we wait some time
    // before the we declare the "file does not exist" and return to a common nav location.
    // We timeout after 2 seconds because our Hasura subscriptions evaluate db changes every second.
    const resolveTimeout = addMilliseconds(new Date(), 2000);
    let currentBranchName: string = "main";
    //TODO: notification for "waiting to find file"

    while (isBefore(new Date(), resolveTimeout)) {
      // get latest state
      const state: State = yield select();
      const files = getBranchTypescriptFiles(state);
      const currentBranch = getCurrentBranch(state);

      if (files === undefined) {
        // loop until files have loaded
        yield delay(10);
        continue;
      }
      currentBranchName = currentBranch?.name || "main";

      const {
        selectedModuleName,
        selectedModuleScope,
        selectedModuleVersion,
        selectedFilePath
      } = action.payload.params;

      if (!files || !selectedModuleName || !selectedModuleVersion) {
        return;
      }
      const sortedModuleVersions = makeSortedVersionsForModuleSelector(
        selectedModuleName,
        selectedModuleScope || ""
      )(state);

      const latestMainVersion =
        sortedModuleVersions && sortedModuleVersions.length
          ? sortedModuleVersions.find(v => v.branch_name === "main")
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

      const fileToOpen = possiblyForkedFiles.find(pff => {
        const match =
          pff.file.module_name === selectedModuleName &&
          sanitizeScope(pff.file.module_scope) ===
            sanitizeScope(selectedModuleScope) &&
          pff.file.module_version === selectedModuleVersion &&
          sanitizeFilePath(pff.file.path) ===
            sanitizeFilePath(selectedFilePath);
        return match;
      });

      if (!fileToOpen) {
        // Wait and then try again
        yield delay(10);
        continue;
      } else {
        yield putResolve(actions.openFile(fileToOpen));
        yield call(
          navigateToFile,
          fileToOpen.file,
          action.payload.history,
          currentBranch?.name
        );
        return;
      }
    }
    // TODO: notification
    console.error("file does not exist");
    // redirect to root of branch
    yield call(action.payload.history.push, `/module/${currentBranchName}`);
  } finally {
    if (yield cancelled()) {
      if (process.env.NODE_ENV === "development") {
        console.info("canceled fileOpen due to new request");
      }
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
