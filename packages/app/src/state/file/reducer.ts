/**
 * Copyright 2019-2021 Opstrace, Inc.
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

import { Files } from "./types";
import * as actions from "./actions";
import TextFileModel from "./TextFileModel";

type FilesActions = ActionType<typeof actions>;

type FilesState = {
  files: Files;
  selectedFileId?: string;
  selectedFilePath?: string;
  selectedModuleName?: string;
  selectedModuleScope?: string;
  selectedModuleVersion?: string;
  openFiles: TextFileModel[];
  loading: boolean;
};

const FilesInitialState: FilesState = {
  files: [],
  openFiles: [],
  loading: true
};

export const reducer = createReducer<FilesState, FilesActions>(
  FilesInitialState
)
  .handleAction(
    actions.set,
    (state, action): FilesState => {
      return {
        ...state,
        files: action.payload,
        loading: false
      };
    }
  )
  .handleAction(
    actions.requestOpenFileWithParams,
    (state, action): FilesState => {
      return {
        ...state,
        ...action.payload
      };
    }
  )
  .handleAction(
    actions.openFile,
    (state, action): FilesState => {
      const alreadyOpen = state.openFiles.find(
        f => f.file.id === action.payload.file.id
      );

      const openFiles = alreadyOpen
        ? state.openFiles
        : [...state.openFiles, new TextFileModel(action.payload)];

      // ensure it's the last item in the array
      if (alreadyOpen) {
        const idx = openFiles.findIndex(
          f => f.file.id === action.payload.file.id
        );
        openFiles.splice(idx, 1);
        openFiles.push(alreadyOpen);
      }

      const trimmedOpenFiles = openFiles.slice(
        Math.max(openFiles.length - 5, 0)
      );
      // dispose the open files we've just trimmed from the array
      openFiles
        .filter(a => !trimmedOpenFiles.find(b => a === b))
        .forEach(openFile => openFile.dispose());

      return {
        ...state,
        // limit number of open files to 5 for now
        openFiles: trimmedOpenFiles,
        selectedFileId: action.payload.file.id,
        selectedFilePath: action.payload.file.path,
        selectedModuleName: action.payload.file.module_name,
        selectedModuleScope: action.payload.file.module_scope,
        selectedModuleVersion: action.payload.file.module_version
      };
    }
  )
  .handleAction(
    actions.closeFile,
    (state, action): FilesState => {
      const fileToClose = state.openFiles.find(
        f => f.file.id === action.payload
      );
      if (fileToClose) {
        fileToClose.dispose();
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
        selectedFileId,
        openFiles
      };
    }
  );
