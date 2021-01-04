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

// import type { editor } from "monaco-editor/esm/vs/editor/editor.api";
import { SubscribeToFilesSubscription } from "state/clients/graphqlClient";

export type ChangeHandler = (
  value: string,
  event: monaco.editor.IModelContentChangedEvent
) => void;

export type EditorOptions = NonNullable<
  Parameters<typeof monaco.editor.create>[1]
>;

export type File = SubscribeToFilesSubscription["file"][0] & {
  // contents are stored in s3 and merged into the rest of this object (from Postgres)
  contents?: string;
};
export type Files = File[];

// use this same id to unsubscribe
export type SubscriptionID = number;

export interface IDirectory {
  directories: IDirectory[];
  files: IPossiblyForkedFile[];
  path: string;
  name: string;
}

export interface IPossiblyForkedFile {
  // the file that is possibly forked
  file: File;
  // if this file is on a branch other than main, then baseFile points to the file on main if this is not a new file.
  // The baseFile represents the version that this file has been rebased with.
  baseFile?: File;
  // aliasFor represents the actual file (this file is an alias, e.g. "latest" version, points to actual latest file)
  aliasFor?: File;
  // latest version of base file (if this doesn't equal this.baseFile then a rebase is required to bring baseFile up to the latest version on main branch)
  latestBaseFile?: File;
  // if latestBaseFile is newer than baseFile then rebaseRequired === true;
  rebaseRequired: boolean;
  // if this module cannot be found on main branch, isNewModule === true;
  isNewModule: boolean;
  // if this file cannot be found on main branch, isNewFile === true;
  isNewFile: boolean;
  // track if this file is deleted so when we merge with main, we can remove it
  isDeletedFile: boolean;
  // only possible in live mode, and indicates that file has deviated from baseFile
  isModifiedFile: boolean;
}

export type onErrorHandler = (e: Error) => void;

export type Viewer = {
  email: string;
  color: number[];
  isEditor: boolean;
  selection: UserSelection;
};

export type Selection = {
  selection: number[];
  cursorPosition: number;
};

export type UserSelection = {
  primary: Selection;
  secondary: Selection[];
  source: string;
};

export type ViewerSelection = {
  userId: string;
  name: string;
  selection: UserSelection;
  color: number[];
};

type TextOperationOffset = number;

type DeleteTextOp = number;

type InsertTextOp = string;

type TextOp = InsertTextOp | DeleteTextOp;

type TextOperation = [TextOperationOffset, TextOp];

export type TextOperations = TextOperation[];
