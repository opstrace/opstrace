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

import { createSelector } from "reselect";
import { useSelector, State } from "state/provider";

export const selectIntegration = createSelector(
  (state: State) => state.integrations.loading,
  (state: State, _) => state.integrations.integrations,
  (_: State, integrationId: string) => integrationId,
  (loading, integrations, integrationId: string) =>
    loading ? null : integrations[integrationId]
);

export const useIntegration = (integrationId: string) =>
  useSelector((state: State) => selectIntegration(state, integrationId));
