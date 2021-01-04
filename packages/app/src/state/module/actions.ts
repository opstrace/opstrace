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
import { createAction } from "typesafe-actions";
import { History } from "history";
import { Modules, SubscriptionID } from "./types";

export const set = createAction("SET_MODULES")<Modules>();

export const subscribe = createAction("SUBSCRIBE_MODULES")<SubscriptionID>();
export const unsubscribe = createAction("UNSUBSCRIBE_MODULES")<
  SubscriptionID
>();

export const createModule = createAction("CREATE_MODULE")<{
  history: History;
  name: string;
}>();
export const deleteModule = createAction("DELETE_MODULE")<{
  history: History;
  name: string;
}>();
