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

// For each dashboard we want, we import it here and list it below
import makeSummaryDashboard from "./summary.js";

type FolderProps = {
  integrationId: String;
  integrationName: String;
}

type DashboardProps = {
  integrationId: String;
  folderId: number;
};

// Returns a folder creation request payload for submitting to Grafana.
export function makeFolderRequest({
  integrationId,
  integrationName
}: FolderProps): object {
  return {
    uid: `i9n-${integrationId}`,
    title: `Integration: ${integrationName}`
  };
}

// Returns an array of Promtail/logs dashboard creation request payloads for submitting to Grafana.
export function makePromtailDashboardRequests({
  integrationId,
  folderId
}: DashboardProps): object[] {
  return [
    {
      uid: `sum-${integrationId}`,
      dashboard: makeSummaryDashboard(integrationId),
      folderId: folderId,
      overwrite: true
    }
  ];
}
