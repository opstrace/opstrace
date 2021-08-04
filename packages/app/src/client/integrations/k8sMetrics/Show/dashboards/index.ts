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
import makeApiserverDashboard from "./apiserver.js";
import makeKubeletDashboard from "./kubelet.js";
import makeResourceDashboard from "./resource.js";

type DashboardProps = {
  integrationId: string;
  folderId: number;
};
// Returns an array of Prometheus/metrics dashboard creation request payloads for submitting to Grafana.
export function makePrometheusDashboardRequests({
  integrationId,
  folderId
}: DashboardProps) {
  return [
    {
      uid: `as-${integrationId}`,
      dashboard: makeApiserverDashboard(integrationId),
      folderId: folderId,
      overwrite: true
    },
    {
      uid: `kub-${integrationId}`,
      dashboard: makeKubeletDashboard(integrationId),
      folderId: folderId,
      overwrite: true
    },
    {
      uid: `res-${integrationId}`,
      dashboard: makeResourceDashboard(integrationId),
      folderId: folderId,
      overwrite: true
    }
  ];
}
