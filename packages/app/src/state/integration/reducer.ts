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

import { pluck, zipObj, mergeDeepRight } from "ramda";

import { createReducer, ActionType } from "typesafe-actions";

import { IntegrationRecords } from "./types";
import * as actions from "./actions";

type IntegrationActions = ActionType<typeof actions>;

type IntegrationState = {
  loading: boolean;
  integrations: IntegrationRecords;
};

const IntegrationInitialState: IntegrationState = {
  loading: true,
  integrations: {}
};

export const reducer = createReducer<IntegrationState, IntegrationActions>(
  IntegrationInitialState
).handleAction(
  actions.setIntegrationList,
  (state, action): IntegrationState => {
    const ids: string[] = pluck("id", action.payload);
    const integrations: IntegrationRecords = zipObj(ids, action.payload);
    return mergeDeepRight(state, {
      loading: false,
      integrations: integrations
    });
  }
);
