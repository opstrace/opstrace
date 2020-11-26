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

import { createAsyncAction, createAction } from "typesafe-actions";
import { ControllerConfigType } from "./types";

export namespace actions {
  export const set = createAsyncAction(
    "SET_CONFIG_REQUEST",
    "SET_CONFIG_SUCCESS",
    "SET_CONFIG_FAILURE"
  )<
    { config: ControllerConfigType },
    { config: ControllerConfigType },
    { config: ControllerConfigType; error: Error }
  >();

  export const destroy = createAsyncAction(
    "DESTROY_CONFIG_REQUEST",
    "DESTROY_CONFIG_SUCCESS",
    "DESTROY_CONFIG_FAILURE"
  )<{ name: string }, { name: string }, { name: string; error: Error }>();

  export const fetchAll = createAsyncAction(
    "FETCH_CONFIG_REQUEST",
    "FETCH_CONFIG_SUCCESS",
    "FETCH_CONFIG_FAILURE"
  )<undefined, { config: ControllerConfigType }, { error: Error }>();

  export const subscribe = createAction("SUBSCRIBE_CONFIG")<{}>();

  export const unSubscribe = createAction("UNSUBSCRIBE_CONFIG")<{}>();

  export const onChanged = createAction("ON_CONFIG_CHANGED")<{
    config: ControllerConfigType;
  }>();
}
