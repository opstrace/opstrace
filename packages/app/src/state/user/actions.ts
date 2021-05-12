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
import { SubscriptionID, Users } from "./types";

export const setCurrentUser = createAction("SET_CURRENT_USER")<string>();

export const requestSetDarkMode = createAction(
  "REQUEST_SET_DARK_MODE"
)<boolean>();
export const setDarkMode = createAction("SET_DARK_MODE")<boolean>();

export const subscribeToUserList = createAction(
  "SUBSCRIBE_USER_LIST"
)<SubscriptionID>();

export const unsubscribeFromUserList = createAction(
  "UNSUBSCRIBE_USER_LIST"
)<SubscriptionID>();
export const setUserList = createAction("SET_USER_LIST")<Users>();
export const deleteUser = createAction("DELETE_USER")<string>();
export const addUser = createAction("ADD_USER")<string>();
