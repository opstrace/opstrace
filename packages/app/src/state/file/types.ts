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

export type ChangeHandler = (
  value: string,
  event: monaco.editor.IModelContentChangedEvent
) => void;

export type EditorOptions = NonNullable<
  Parameters<typeof monaco.editor.create>[1]
>;

// use this same id to unsubscribe
export type SubscriptionID = number;

export interface IDirectory {
  directories: IDirectory[];
  files: { id: string; path: string }[];
  path: string;
  name: string;
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
