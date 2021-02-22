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
import { useEffect } from "react";
import { createSelector } from "reselect";

import { useDispatch, useSelector, State } from "state/provider";
import { subscribe, unsubscribe } from "../actions";
import getSubscriptionID from "state/utils/getSubscriptionID";

import {
  getCurrentBranch,
  useCurrentBranchName
} from "state/branch/hooks/useBranches";

export const getFiles = createSelector(
  (state: State) => state.files.filesByBranch,
  files => files
);

const getOpenFiles = createSelector(
  (state: State) => state.files.openFiles,
  openFiles => openFiles
);

export const getOpenFileParams = createSelector(
  (state: State) => state.files,
  fileState => ({
    requestedModuleName: fileState.selectedModuleName,
    requestedModuleScope: fileState.selectedModuleScope,
    requestedModuleVersion: fileState.selectedModuleVersion,
    requestedFilePath: fileState.selectedFilePath,
    requestOpenFilePending: fileState.requestOpenFilePending
  })
);

const getCurrentlySelectedFileId = (state: State) => state.files.selectedFileId;
const getLoadingState = (state: State) => state.files.loaded;

const hasBranchLoaded = createSelector(
  getLoadingState,
  getCurrentBranch,
  (loadedBranches, currentBranch) =>
    currentBranch?.name &&
    loadedBranches["main"] &&
    loadedBranches[currentBranch.name]
);

export const getCurrentlySelectedFile = createSelector(
  hasBranchLoaded,
  getOpenFiles,
  getCurrentlySelectedFileId,
  (loaded, openFiles, selectedFileId) => {
    if (!loaded) {
      return undefined;
    }
    return openFiles.find(f => f.file.id === selectedFileId) || null;
  }
);

export const getCurrentBranchFiles = createSelector(
  hasBranchLoaded,
  getFiles,
  getCurrentBranch,
  (loaded, files, currentBranch) => {
    if (!loaded || currentBranch === undefined) {
      return undefined;
    }
    if (currentBranch === null) {
      return null;
    }
    const branchFiles = files[currentBranch.name];

    if (currentBranch.name === "main") {
      return Object.values(branchFiles);
    }

    return Object.values(branchFiles).concat(Object.values(files["main"]));
  }
);

export function useOpenFileRequestParams() {
  return useSelector(getOpenFileParams);
}

export function useFocusedOpenFile() {
  return useSelector(getCurrentlySelectedFile);
}

export function useOpenFiles() {
  return useSelector(getOpenFiles);
}
/**
 * Return all files from current branch and main branch,
 * with all current branch files at the beginning of the returned array
 */
export function useBranchFiles() {
  const currentBranchFiles = useSelector(getCurrentBranchFiles);
  const currentBranchName = useCurrentBranchName();

  const dispatch = useDispatch();

  useEffect(() => {
    const subId = getSubscriptionID();
    const _currentBranchName = currentBranchName;
    dispatch(subscribe({ branch: "main", subId }));

    if (_currentBranchName !== "main") {
      dispatch(subscribe({ branch: _currentBranchName, subId }));
    }
    return () => {
      dispatch(unsubscribe({ branch: "main", subId }));
      if (_currentBranchName !== "main") {
        dispatch(unsubscribe({ branch: _currentBranchName, subId }));
      }
    };
  }, [dispatch, currentBranchName]);

  return currentBranchFiles;
}

/**
 * get all of the latest ts files for each module.
 */
export function useLatestBranchFiles() {
  const files = useBranchFiles();

  if (!files) {
    return files;
  }

  const latestFiles = files.filter(f => f.file.module_version === "latest");

  return { files: latestFiles, tsFileCount: files.length };
}

/**
 * get all files for a module version, on the current branch.
 *
 * returns an object for each file with all necessary data to
 * handle how to show or rebase the file.
 */
export function useBranchFilesForModuleVersion(
  moduleName: string,
  moduleScope: string,
  version: string
) {
  const files = useBranchFiles();

  if (!files) {
    return files;
  }

  const moduleVersionFiles = files.filter(
    tf =>
      tf.file.module_name === moduleName &&
      tf.file.module_scope === moduleScope &&
      tf.file.module_version === version
  );
  // filter out any duplications between current branch and main branch
  return moduleVersionFiles.filter(
    (a, idx) =>
      idx === moduleVersionFiles.findIndex(b => b.file.path === a.file.path)
  );
}
