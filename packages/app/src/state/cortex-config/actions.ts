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
import { SubscriptionID, Config, RuntimeConfig } from "./types";

export const setCortexRuntimeConfig = createAction(
  "SET_CORTEX_RUNTIME_CONFIG"
)<RuntimeConfig>();
export const updateCortexRuntimeConfig = createAction(
  "UPDATE_CORTEX_RUNTIME_CONFIG_OPTION"
)<{
  tenant: string;
  configOption: string;
  value: string | boolean | number | undefined;
}>();
export const deleteCortexRuntimeConfig = createAction(
  "DELETE_CORTEX_RUNTIME_CONFIG_OPTION"
)<{
  tenant: string;
  configOption: string;
}>();
export const setRecognizedCortexRuntimeConfig = createAction(
  "SET_CORTEX_RECOGNIZED_RUNTIME_CONFIG"
)<RuntimeConfig>();
export const setCortexConfig = createAction("SET_CORTEX_CONFIG")<Config>();

export const setCortexConfigError = createAction(
  "SET_CORTEX_CONFIG_LOADING_ERROR"
)<string>();

export const saveCortexRuntimeConfig = createAction(
  "SAVE_CORTEX_RUNTIME_CONFIG"
)<RuntimeConfig>();
export const saveCortexRuntimeConfigError = createAction(
  "SAVE_CORTEX_RUNTIME_CONFIG_ERROR"
)<string>();

export const subscribeToCortexConfig = createAction(
  "SUBSCRIBE_CORTEX_CONFIG"
)<SubscriptionID>();

export const unsubscribeFromCortexConfig = createAction(
  "UNSUBSCRIBE_CORTEX_CONFIG"
)<SubscriptionID>();
