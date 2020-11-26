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
import semverGt from "semver/functions/gt";

import { useDispatch, useSelector, State } from "state/provider";
import { subscribe, unsubscribe } from "../actions";
import getSubscriptionID from "state/utils/getSubscriptionID";

import { useLatestMainVersionForModule } from "state/moduleVersion/hooks/useModuleVersions";
import { getCurrentBranch } from "state/branch/hooks/useBranches";
import { getFileUri } from "../utils/uri";
import { isTypescriptFile } from "../utils/fileType";
import getPossiblyForkedFilesForModuleVersion from "../utils/possiblyForkedFiles";
import { File, IPossiblyForkedFile } from "../types";

const getFiles = createSelector(
  (state: State) => state.files.files,
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
    requestedFilePath: fileState.selectedFilePath
  })
);

const getCurrentlySelectedFileId = (state: State) => state.files.selectedFileId;

export const getCurrentlySelectedFile = createSelector(
  (state: State) => state.files.loading,
  getOpenFiles,
  getCurrentlySelectedFileId,
  (loadingFiles, openFiles, selectedFileId) => {
    if (loadingFiles) {
      return undefined;
    }
    return openFiles.find(f => f.file.id === selectedFileId) || null;
  }
);

export const getCurrentBranchFiles = createSelector(
  (state: State) => state.files.loading,
  getFiles,
  getCurrentBranch,
  (loading, files, currentBranch) => {
    if (loading || currentBranch === undefined) {
      return undefined;
    }
    if (currentBranch === null) {
      return null;
    }
    return files.filter(
      f => f.branch_name === currentBranch?.name || f.branch_name === "main"
    );
  }
);

export const getBranchTypescriptFiles = createSelector(
  getCurrentBranchFiles,
  files => {
    if (!files) {
      return files;
    }
    return files.filter(isTypescriptFile);
  }
);

export function useOpenFileRequestParams() {
  return useSelector(getOpenFileParams);
}

export function useFocusedOpenFile() {
  return useSelector(getCurrentlySelectedFile);
}

export function useBranchFiles() {
  const currentBranchFiles = useSelector(getCurrentBranchFiles);

  const dispatch = useDispatch();

  useEffect(() => {
    const subId = getSubscriptionID();
    dispatch(subscribe(subId));

    return () => {
      dispatch(unsubscribe(subId));
    };
  }, [dispatch]);

  return currentBranchFiles;
}

export function useBranchTypescriptFiles() {
  const files = useBranchFiles();
  if (!files) {
    return files;
  }

  return files.filter(isTypescriptFile);
}

/**
 * get all of the latest ts files for each module.
 */
export function useLatestBranchTypescriptFiles() {
  const files = useBranchTypescriptFiles();

  const latest = new Map<string, File>();

  if (!files) {
    return files;
  }

  files.forEach(f => {
    const uri = getFileUri(f, { useLatest: true });
    const version = latest.get(uri);

    if (!version) {
      latest.set(uri, f);
      return;
    }

    if (semverGt(f.module_version, version.module_version)) {
      latest.set(uri, f);
    }
  });

  return { files: [...latest.values()], tsFileCount: files.length };
}

/**
 * get all ts files for a module version, on the current branch.
 *
 * returns an object for each file with all necessary data to
 * handle how to show or rebase the file.
 */
export function useBranchTypescriptFilesForModuleVersion(
  moduleName: string,
  moduleScope: string,
  version: string
): IPossiblyForkedFile[] | null | undefined {
  const files = useBranchTypescriptFiles();
  // find latest version of module on main branch
  const latestMainVersion = useLatestMainVersionForModule(
    moduleName,
    moduleScope
  );
  // is a new module if we couldn't find a version of it on main
  const isNewModule = !latestMainVersion;

  if (!files) {
    return files;
  }

  const moduleFiles = files.filter(
    f => f.module_name === moduleName && f.module_scope === moduleScope
  );

  return getPossiblyForkedFilesForModuleVersion(
    moduleFiles,
    isNewModule,
    version,
    latestMainVersion?.version
  );
}
