/**
 * Copyright 2019-2021 Opstrace, Inc.
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
import { SubscriptionID, Tenants } from "./types";

export const subscribeToTenantList = createAction("SUBSCRIBE_TENANT_LIST")<
  SubscriptionID
>();

export const unsubscribeFromTenantList = createAction(
  "UNSUBSCRIBE_TENANT_LIST"
)<SubscriptionID>();
export const setTenantList = createAction("SET_TENANT_LIST")<Tenants>();
export const deleteTenant = createAction("DELETE_TENANT")<string>();
export const addTenant = createAction("ADD_TENANT")<string>();
