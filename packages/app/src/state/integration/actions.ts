/**
 * Copyright 2021 Opstrace, Inc.
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

import { Integration, Integrations, SubscriptionID } from "./types";

export const addIntegration = createAction("ADD_INTEGRATION")<{
  integration: Integration;
}>();
export const deleteIntegration = createAction("DELETE_INTEGRATION")<{
  tenantId: string;
  id: string;
}>();
export const subscribeToIntegrationList = createAction(
  "SUBSCRIBE_INTEGRATION_LIST"
)<{ subId: SubscriptionID; tenant: string }>();

export const unsubscribeFromIntegrationList = createAction(
  "UNSUBSCRIBE_INTEGRATION_LIST"
)<{ subId: SubscriptionID; tenant: string }>();

export const setIntegrationList = createAction(
  "SET_INTEGRATION_LIST"
)<Integrations>();

export const clearIntegrations = createAction("CLEAR_INTEGRATIONS")();
