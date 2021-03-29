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

import { createReducer, ActionType } from "typesafe-actions";
import { configMapActions } from "@opstrace/kubernetes";
import { LatestControllerConfigType } from "../schema";
import { isConfigStorage, deserialize } from "../utils";

type Actions = ActionType<typeof configMapActions>;

type ConfigState = {
  config: LatestControllerConfigType | undefined;
  loading: boolean;
  backendExists: boolean | null;
  error: Error | null;
};

const configInitialState: ConfigState = {
  config: undefined,
  loading: false,
  backendExists: null, // Indicates that we don't know yet
  error: null
};

export const configReducer = createReducer<ConfigState, Actions>(
  configInitialState
)
  .handleAction(
    configMapActions.fetch.request,
    (state): ConfigState => ({
      ...state,
      loading: true
    })
  )
  .handleAction(
    configMapActions.fetch.success,
    (state, action): ConfigState => {
      const configMap = action.payload.resources.find(isConfigStorage);
      let config: LatestControllerConfigType | undefined = undefined;
      if (configMap) {
        config = deserialize(configMap);
      }

      return {
        ...state,
        backendExists: configMap ? true : false,
        config,
        error: null,
        loading: false
      };
    }
  )
  .handleAction(
    configMapActions.fetch.failure,
    (state, action): ConfigState => ({
      ...state,
      ...action.payload,
      loading: false
    })
  )
  .handleAction(
    [configMapActions.onUpdated, configMapActions.onAdded],
    (state, action): ConfigState => {
      const configMap = isConfigStorage(action.payload)
        ? action.payload
        : false;

      if (!configMap) {
        return state;
      }
      const config = deserialize(configMap);

      return {
        ...state,
        backendExists: true,
        config,
        error: null,
        loading: false
      };
    }
  );
