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
import { CurrentUser, SubscriptionID } from "./types";

export const setCurrentUser = createAction("SET_CURRENT_USER")<CurrentUser>();
export const setCurrentUserNull = createAction("SET_CURRENT_USER_NULL")();
export const setDarkMode = createAction("SET_DARK_MODE")<boolean>();

export const subscribe = createAction("SUBSCRIBE_CURRENT_USER")<
  SubscriptionID
>();

export const unsubscribe = createAction("UNSUBSCRIBE_CURRENT_USER")<
  SubscriptionID
>();
