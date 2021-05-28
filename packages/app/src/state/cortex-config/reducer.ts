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
import { RuntimeConfig, Config } from "./types";
import * as actions from "./actions";

type CortexConfigActions = ActionType<typeof actions>;

type CortexConfigState = {
  loadingRuntimeConfig: boolean;
  loadingRecognizedRuntimeConfig: boolean;
  loadingConfig: boolean;
  loadingError?: string;
  runtimeConfig?: RuntimeConfig;
  recognizedRuntimeConfig?: RuntimeConfig;
  config?: Config;
};

const CortexConfigInitialState: CortexConfigState = {
  loadingRuntimeConfig: true,
  loadingRecognizedRuntimeConfig: true,
  loadingConfig: true
};

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
    (state, action): CortexConfigState => ({
      ...state,
      loadingRuntimeConfig: false,
      runtimeConfig: action.payload
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
