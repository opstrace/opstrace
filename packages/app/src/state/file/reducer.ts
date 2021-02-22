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

import { createReducer, ActionType } from "typesafe-actions";

import * as actions from "./actions";
import TextFileModel from "./TextFileModel";
import { getFileUri } from "./utils/uri";

type FilesActions = ActionType<typeof actions>;

export interface FilesByBranch {
  [branch: string]: { [path: string]: TextFileModel };
}

type FilesState = {
  filesByBranch: FilesByBranch;
  requestOpenFilePending: boolean;
  selectedFileId?: string;
  selectedFilePath?: string;
  selectedModuleName?: string;
  selectedModuleScope?: string;
  selectedModuleVersion?: string;
  openFiles: TextFileModel[];
  openFileBrowsingHistory: string[];
  loaded: {
    [branch: string]: boolean;
  };
};

const FilesInitialState: FilesState = {
  filesByBranch: {},
  openFiles: [],
  openFileBrowsingHistory: [],
  loaded: {},
  requestOpenFilePending: false
};

export const reducer = createReducer<FilesState, FilesActions>(
  FilesInitialState
)
  .handleAction(
    actions.set,
    (state, action): FilesState => {
      const filesByPath: { [key: string]: TextFileModel } = {};
      const files = action.payload.files;
      const branch = action.payload.branch;
      const branchFiles = state.filesByBranch[branch] || {};

      files.forEach(file => {
        const path = getFileUri(file, { branch, ext: true });
        const existingFile = branchFiles[path];

        filesByPath[path] = existingFile
          ? existingFile
          : new TextFileModel({ branch_name: branch, ...file });
      });

      return {
        ...state,
        filesByBranch: { ...state.filesByBranch, [branch]: filesByPath },
        loaded: { ...state.loaded, [branch]: true }
      };
    }
  )
  .handleAction(
    actions.requestOpenFileWithParams,
    (state, action): FilesState => {
      return {
        ...state,
        ...action.payload,
        requestOpenFilePending: true
      };
    }
  )
  .handleAction(
    actions.openFile,
    (state, action): FilesState => {
      const fileId = action.payload.file.id;
      const alreadyOpen = state.openFiles.find(f => f.file.id === fileId);

      const openFiles = alreadyOpen
        ? state.openFiles
        : [...state.openFiles, action.payload];

      const browsingHistory = state.openFileBrowsingHistory
        .filter(id => id !== fileId)
        .concat([fileId]);

      const filesToKeepOpen = browsingHistory.slice(
        Math.max(browsingHistory.length - 5, 0)
      );

      const trimmedOpenFiles = openFiles.filter(a =>
        filesToKeepOpen.find(b => a.file.id === b)
      );

      return {
        ...state,
        // limit number of open files to 5 for now
        openFiles: trimmedOpenFiles,
        openFileBrowsingHistory: filesToKeepOpen,
        selectedFileId: action.payload.file.id,
        selectedFilePath: action.payload.file.path,
        selectedModuleName: action.payload.file.module_name,
        selectedModuleScope: action.payload.file.module_scope,
        selectedModuleVersion: action.payload.file.module_version,
        requestOpenFilePending: false
      };
    }
  )
  .handleAction(
    actions.closeFile,
    (state, action): FilesState => {
      // Always leave one file open
      if (state.openFiles.length === 1) {
        return state;
      }

      const openFiles = state.openFiles.filter(
        f => f.file.id !== action.payload
      );

      const selectedFileId =
        state.selectedFileId === action.payload
          ? openFiles[openFiles.length - 1].file.id
          : state.selectedFileId;

      return {
        ...state,
        openFileBrowsingHistory: state.openFileBrowsingHistory.filter(
          id => id !== action.payload
        ),
        selectedFileId,
        openFiles
      };
    }
  );
