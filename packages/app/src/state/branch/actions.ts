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
import { createAction, createAsyncAction } from "typesafe-actions";
import { History } from "history";
import { Branches, SubscriptionID } from "./types";

export const set = createAction("SET_BRANCHES")<Branches>();
/**
 * Set current branch by name
 */
export const setCurrentBranch = createAction("SET_CURRENT_BRANCH")<{
  history: History;
  name: string;
}>();

export const subscribe = createAction("SUBSCRIBE_BRANCHES")<SubscriptionID>();
export const unsubscribe = createAction("UNSUBSCRIBE_BRANCHES")<
  SubscriptionID
>();

export const createBranch = createAsyncAction(
  "CREATE_BRANCH_REQUEST",
  "CREATE_BRANCH_SUCCESS",
  "CREATE_BRANCH_FAILURE"
)<
  { name: string; history: History },
  { name: string; history: History },
  { name: string; history: History }
>();
