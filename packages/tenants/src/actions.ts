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

import { createAsyncAction, createAction } from "typesafe-actions";
import { Tenant, Tenants } from "./types";

export namespace actions {
  export const set = createAsyncAction(
    "SET_TENANT_REQUEST",
    "SET_TENANT_SUCCESS",
    "SET_TENANT_FAILURE"
  )<{ tenant: Tenant }, { tenant: Tenant }, { tenant: Tenant; error: Error }>();

  export const destroy = createAsyncAction(
    "DESTROY_TENANT_REQUEST",
    "DESTROY_TENANT_SUCCESS",
    "DESTROY_TENANT_FAILURE"
  )<{ name: string }, { name: string }, { name: string; error: Error }>();

  export const fetchAll = createAsyncAction(
    "FETCH_TENANTS_REQUEST",
    "FETCH_TENANTS_SUCCESS",
    "FETCH_TENANTS_FAILURE"
  )<undefined, { tenants: Tenants }, { error: Error }>();

  export const subscribe = createAction("SUBSCRIBE_TENANTS")<{}>();

  export const unSubscribe = createAction("UNSUBSCRIBE_TENANTS")<{}>();

  export const onChanged = createAction("ON_TENANTS_CHANGED")<{
    tenants: Tenants;
  }>();
}
