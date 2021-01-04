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
import { TextOperations, UserSelection } from "state/file/types";
import { createAction } from "typesafe-actions";

export const subscribeFile = createAction("SUBSCRIBE_FILE")<string>();
export const unsubscribeFile = createAction("UNSUBSCRIBE_FILE")<string>();

export const fileContent = createAction("FILE_CONTENT")<string>();
export const viewers = createAction("FILE_VIEWERS")<{
  fileId: string;
  viewers: string[];
  editor: string;
}>();

export const edit = createAction("FILE_EDIT")<{
  fileId: string;
  ops: TextOperations;
}>();

export const claimEditor = createAction("FILE_CLAIM_EDITOR")<string>();

export const viewerSelectionChange = createAction("FILE_USER_SELECTION")<{
  email?: string;
  fileId: string;
  selection: UserSelection;
}>();
