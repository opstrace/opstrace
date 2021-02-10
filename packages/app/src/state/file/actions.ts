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
import { createAction } from "typesafe-actions";
import { History } from "history";
import { Files, IPossiblyForkedFile, SubscriptionID } from "./types";

export const set = createAction("SET_FILES")<Files>();

export const subscribe = createAction("SUBSCRIBE_FILES")<SubscriptionID>();
export const unsubscribe = createAction("UNSUBSCRIBE_FILES")<SubscriptionID>();

export const openFile = createAction("OPEN_FILE")<IPossiblyForkedFile>();
export const closeFile = createAction("CLOSE_FILE")<string>();

export const requestOpenFileWithParams = createAction("REQUEST_FILE_OPEN")<{
  history: History;
  params: {
    selectedFilePath: string;
    selectedModuleName: string;
    selectedModuleScope: string;
    selectedModuleVersion: string;
  };
}>();
