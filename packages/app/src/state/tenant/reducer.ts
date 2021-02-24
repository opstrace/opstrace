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
import { Tenant, Tenants } from "./types";
import * as actions from "./actions";

type TenantActions = ActionType<typeof actions>;

type TenantState = {
  loading: boolean;
  tenants: Tenants;
};

const TenantInitialState: TenantState = {
  loading: true,
  tenants: []
};

export const reducer = createReducer<TenantState, TenantActions>(
  TenantInitialState
)
  .handleAction(
    actions.setTenantList,
    (state, action): TenantState => ({
      ...state,
      tenants: action.payload,
      loading: false
    })
  )
  .handleAction(
    actions.alertmanagerConfigLoaded,
    (state, action): TenantState => {
      // console.log("alertmanagerConfigLoaded", action.payload);
      const tenants = state.tenants.map((tenant: Tenant) => {
        if (tenant.name === action.payload.tenantName)
          return { ...tenant, alertmanager_config: action.payload.config };
        else return tenant;
      });

      return {
        ...state,
        tenants
      };
    }
  )
  .handleAction(
    actions.saveAlertmanagerConfig,
    (state, action): TenantState => {
      const tenants = state.tenants.map((tenant: Tenant) => {
        if (tenant.name === action.payload.tenantName)
          return { ...tenant, alertmanager_config: action.payload.config };
        else return tenant;
      });

      return {
        ...state,
        tenants
      };
    }
  );
