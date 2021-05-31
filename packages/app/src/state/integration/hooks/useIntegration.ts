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

import { useParams } from "react-router";
import { createSelector } from "reselect";

import { useSelector, State } from "state/provider";

import { Integration } from "state/integration/types";
import { useIntegrationListSubscription } from "./useIntegrationList";

export const selectIntegration = createSelector(
  (state: State) => state.integrations.loading,
  (state, _) => state.integrations.integrations,
  (_: State, id: string) => id,
  (loading, integrations, id: string) =>
    loading === false ? integrations[id] : null
);

export function useSelectedIntegration() {
  const params = useParams<{ integrationId: string }>();
  return useIntegration(params.integrationId || "");
}

export default function useIntegration(
  id: string
): Integration | null | undefined {
  useIntegrationListSubscription();
  // can return undefined if the id does not exist
  return useSelector((state: State) => selectIntegration(state, id));
}
