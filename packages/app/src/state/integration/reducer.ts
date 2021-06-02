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

import { pluck, zipObj, mergeDeepRight, omit } from "ramda";

import { createReducer, ActionType } from "typesafe-actions";

import { IntegrationRecords } from "./types";
import * as actions from "./actions";
import * as globalActions from "state/global/actions";

const allActions = mergeDeepRight(globalActions, actions);

type IntegrationActions = ActionType<typeof allActions>;

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
)
  .handleAction(
    actions.updateIntegrations,
    (state, action): IntegrationState => {
      const updatedIds: string[] = pluck("id", action.payload);
      const updatedIntegrations: IntegrationRecords = zipObj(
        updatedIds,
        action.payload
      );

      // note: by merging with our current redux state rather than replace we keep state from other sources such as grafana
      return {
        loading: false,
        integrations: mergeDeepRight(state.integrations)(updatedIntegrations)
      };
    }
  )
  .handleAction(
    actions.updateGrafanaStateForIntegration,
    (state, action): IntegrationState => {
      return mergeDeepRight(state, {
        integrations: {
          [action.payload.id]: {
            grafana: action.payload.grafana
          }
        }
      });
    }
  )
  .handleAction(
    actions.addIntegration,
    (state, action): IntegrationState => {
      return {
        loading: state.loading,
        integrations: mergeDeepRight(state.integrations)({
          [action.payload.integration.id]: action.payload.integration
        })
      };
    }
  )
  .handleAction(
    actions.deleteIntegration,
    (state, action): IntegrationState => {
      return {
        loading: state.loading,
        integrations: omit([action.payload.id])(state.integrations)
      };
    }
  )
  .handleAction(
    globalActions.selectedTenantChanged,
    (state, action): IntegrationState => {
      return IntegrationInitialState;
    }
  );
