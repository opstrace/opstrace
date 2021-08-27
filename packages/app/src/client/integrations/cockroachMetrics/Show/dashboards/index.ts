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
import makeChangefeedsDashboard from "./changefeeds";
import makeDistributedDashboard from "./distributed";
import makeHardwareDashboard from "./hardware";
import makeOverviewDashboard from "./overview";
import makeQueuesDashboard from "./queues";
import makeReplicationDashboard from "./replication";
import makeRuntimeDashboard from "./runtime";
import makeSlowRequestDashboard from "./slow_request";
import makeSqlDashboard from "./sql";
import makeStorageDashboard from "./storage";

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
      uid: `cha-${integrationId}`,
      dashboard: makeChangefeedsDashboard(integrationId),
      folderId: folderId,
      overwrite: true
    },
    {
      uid: `dis-${integrationId}`,
      dashboard: makeDistributedDashboard(integrationId),
      folderId: folderId,
      overwrite: true
    },
    {
      uid: `har-${integrationId}`,
      dashboard: makeHardwareDashboard(integrationId),
      folderId: folderId,
      overwrite: true
    },
    {
      uid: `ove-${integrationId}`,
      dashboard: makeOverviewDashboard(integrationId),
      folderId: folderId,
      overwrite: true
    },
    {
      uid: `que-${integrationId}`,
      dashboard: makeQueuesDashboard(integrationId),
      folderId: folderId,
      overwrite: true
    },
    {
      uid: `rep-${integrationId}`,
      dashboard: makeReplicationDashboard(integrationId),
      folderId: folderId,
      overwrite: true
    },
    {
      uid: `run-${integrationId}`,
      dashboard: makeRuntimeDashboard(integrationId),
      folderId: folderId,
      overwrite: true
    },
    {
      uid: `slo-${integrationId}`,
      dashboard: makeSlowRequestDashboard(integrationId),
      folderId: folderId,
      overwrite: true
    },
    {
      uid: `sql-${integrationId}`,
      dashboard: makeSqlDashboard(integrationId),
      folderId: folderId,
      overwrite: true
    },
    {
      uid: `sto-${integrationId}`,
      dashboard: makeStorageDashboard(integrationId),
      folderId: folderId,
      overwrite: true
    }
  ];
}
