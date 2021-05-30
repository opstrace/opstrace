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
import { RuntimeConfig, Config, CortexLimits } from "./types";
import * as actions from "./actions";
import { mergeDeepRight } from "ramda";
import { unset, isEqual } from "lodash";

type CortexConfigActions = ActionType<typeof actions>;

type CortexConfigState = {
  loadingRuntimeConfig: boolean;
  loadingRecognizedRuntimeConfig: boolean;
  loadingConfig: boolean;
  loadingError?: string;
  saveRuntimeConfigError?: string;
  // Holds the user edited values (first populated on first successful api response for runtimeConfigFile)
  runtimeConfig?: RuntimeConfig;
  // Represents the value from the config map
  runtimeConfigFile?: RuntimeConfig;
  // Represents the value as seen in Cortex via /runtime_config
  recognizedRuntimeConfig?: RuntimeConfig;
  hasUnsavedChanges: boolean;
  config?: Config;
};

const CortexConfigInitialState: CortexConfigState = {
  loadingRuntimeConfig: true,
  loadingRecognizedRuntimeConfig: true,
  loadingConfig: true,
  hasUnsavedChanges: false
};

function hasChanges(state: CortexConfigState) {
  // Check for changes in any of the tenants
  return Object.keys(state.runtimeConfig?.overrides || {}).some(tenant => {
    const existingTenantOverrides =
      (state.runtimeConfigFile?.overrides || {})[tenant] || {};
    const tenantOverrides =
      (state.runtimeConfig?.overrides || {})[tenant] || {};

    return !isEqual(existingTenantOverrides, tenantOverrides);
  });
}

export const reducer = createReducer<CortexConfigState, CortexConfigActions>(
  CortexConfigInitialState
)
  .handleAction(
    actions.setCortexConfig,
    (state, action): CortexConfigState => ({
      ...state,
      loadingConfig: false,
      config: action.payload
    })
  )
  .handleAction(
    actions.setCortexRuntimeConfig,
    (state, action): CortexConfigState => {
      let newState = {
        ...state,
        loadingRuntimeConfig: false,
        runtimeConfigFile: action.payload
      };
      if (!newState.runtimeConfig) {
        // First time we've loaded the runtimeConfig.
        newState = { ...newState, runtimeConfig: action.payload };
      }
      return newState;
    }
  )
  .handleAction(
    actions.updateCortexRuntimeConfig,
    (state, action): CortexConfigState => {
      const newState = mergeDeepRight(state, {
        runtimeConfig: {
          overrides: {
            [action.payload.tenant]: {
              [action.payload.configOption]: action.payload.value
            } as CortexLimits
          }
        }
      });

      return {
        ...newState,
        hasUnsavedChanges: hasChanges(newState)
      };
    }
  )
  .handleAction(
    actions.deleteCortexRuntimeConfig,
    (state, action): CortexConfigState => {
      // This is a dirty way to delete because if we chance our reducer schema then
      // this will break (lost our typings).
      unset(
        state,
        `runtimeConfig.overrides.${action.payload.tenant}.${action.payload.configOption}`
      );

      return { ...state, hasUnsavedChanges: hasChanges(state) };
    }
  )
  .handleAction(
    actions.saveCortexRuntimeConfig,
    (state, action): CortexConfigState => ({
      ...state,
      runtimeConfigFile: state.runtimeConfig,
      hasUnsavedChanges: false
    })
  )
  .handleAction(
    actions.saveCortexRuntimeConfigError,
    (state, action): CortexConfigState => ({
      ...state,
      hasUnsavedChanges: true,
      saveRuntimeConfigError: action.payload
    })
  )
  .handleAction(
    actions.setRecognizedCortexRuntimeConfig,
    (state, action): CortexConfigState => ({
      ...state,
      loadingRecognizedRuntimeConfig: false,
      recognizedRuntimeConfig: action.payload
    })
  )
  .handleAction(
    actions.setCortexConfigError,
    (state, action): CortexConfigState => ({
      ...state,
      loadingError: action.payload
    })
  );
