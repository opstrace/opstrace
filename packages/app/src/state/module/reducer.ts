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
import { Modules } from "./types";
import * as actions from "./actions";

type ModulesActions = ActionType<typeof actions>;

type ModulesState = {
  modules: Modules;
  loading: boolean;
};

const ModulesInitialState: ModulesState = {
  modules: [],
  loading: true
};

export const reducer = createReducer<ModulesState, ModulesActions>(
  ModulesInitialState
).handleAction(
  actions.set,
  (state, action): ModulesState => ({
    ...state,
    modules: action.payload,
    loading: false
  })
);
