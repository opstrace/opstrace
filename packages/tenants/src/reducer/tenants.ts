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
import { Tenants } from "../types";
import { isTenantStorage, deserialize } from "../utils";

type Actions = ActionType<typeof configMapActions>;

type TenantsState = {
  tenants: Tenants;
  loading: boolean;
  backendExists: boolean | null;
  error: Error | null;
};

const tenantsInitialState: TenantsState = {
  tenants: [],
  loading: false,
  backendExists: null, // Indicates that we don't know yet
  error: null
};

export const tenantsReducer = createReducer<TenantsState, Actions>(
  tenantsInitialState
)
  .handleAction(
    configMapActions.fetch.request,
    (state, _): TenantsState => ({
      ...state,
      loading: true
    })
  )
  .handleAction(
    configMapActions.fetch.success,
    (state, action): TenantsState => {
      const configMap = action.payload.resources.find(isTenantStorage);
      let tenants: Tenants = [];
      if (configMap) {
        tenants = deserialize(configMap);
      }

      return {
        ...state,
        backendExists: configMap ? true : false,
        tenants,
        error: null,
        loading: false
      };
    }
  )
  .handleAction(
    configMapActions.fetch.failure,
    (state, action): TenantsState => ({
      ...state,
      ...action.payload,
      loading: false
    })
  )
  .handleAction(
    [configMapActions.onUpdated, configMapActions.onAdded],
    (state, action): TenantsState => {
      const configMap = isTenantStorage(action.payload)
        ? action.payload
        : false;

      if (!configMap) {
        return state;
      }
      const tenants = deserialize(configMap);

      return {
        ...state,
        backendExists: true,
        tenants,
        error: null,
        loading: false
      };
    }
  );
