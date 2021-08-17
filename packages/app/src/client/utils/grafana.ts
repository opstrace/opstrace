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

import axios, { AxiosError } from "axios";
import { isString } from "ramda-adjunct";
import useSWR from "swr";

import useDeepMemo from "client/hooks/useDeepMemo";

import { Tenant } from "state/tenant/types";
import { Integration } from "state/integration/types";
import { Dashboard as CDBChangefeedsDashboard } from "client/integrations/cockroachMetrics/Show/dashboards/changefeeds";
import { Dashboard as CDBDistributedDashboard } from "client/integrations/cockroachMetrics/Show/dashboards/distributed";
import { Dashboard as CDBHardwareDashboard } from "client/integrations/cockroachMetrics/Show/dashboards/hardware";
import { Dashboard as CDBOverviewDashboard } from "client/integrations/cockroachMetrics/Show/dashboards/overview";
import { Dashboard as CDBQueuesDashboard } from "client/integrations/cockroachMetrics/Show/dashboards/queues";
import { Dashboard as CDBReplicationDashboard } from "client/integrations/cockroachMetrics/Show/dashboards/replication";
import { Dashboard as CDBRuntimeDashboard } from "client/integrations/cockroachMetrics/Show/dashboards/runtime";
import { Dashboard as CDBSlowRequestDashboard } from "client/integrations/cockroachMetrics/Show/dashboards/slow_request";
import { Dashboard as CDBSqlDashboard } from "client/integrations/cockroachMetrics/Show/dashboards/sql";
import { Dashboard as CDBStorageDashboard } from "client/integrations/cockroachMetrics/Show/dashboards/storage";
import { Dashboard as K8sLogsSummaryDashboard } from "client/integrations/k8sLogs/Show/dashboards/summary";
import { Dashboard as K8sMetricsApiServerDashboard } from "client/integrations/k8sMetrics/Show/dashboards/apiserver";
import { Dashboard as K8sMetricsKubeletDashboard } from "client/integrations/k8sMetrics/Show/dashboards/kubelet";
import { Dashboard as K8sMetricsResourceDashboard } from "client/integrations/k8sMetrics/Show/dashboards/resource";
import request from "./request";

const makeUuid = (integration: Integration) => `i9n-${integration.id}`;
const makeUrl = (tenant: Tenant, path: string) =>
  `${grafanaUrl({ tenant })}/grafana/api/${path}`;

type FolderProps = {
  integration: Integration;
  tenant: Tenant;
};

type FolderInfo = {
  id: number; // This ID must be included when creating dashboards within the folder.
  path: string; // The '/grafana/...' path linking to the folder in Grafana.
};

// see also: https://grafana.com/docs/grafana/latest/http_api/folder/#create-folder
export async function createFolder({
  integration,
  tenant
}: FolderProps): Promise<FolderInfo> {
  const responseData = await request({
    method: "post",
    url: makeUrl(tenant, "folders"),
    data: {
      uid: makeUuid(integration),
      title: `Integration: ${integration.name}`
    },
    withCredentials: true
  }).then(res => res.data);

  return {
    id: responseData.id,
    path: responseData.url
  };
}

export function useFolder({
  integration,
  tenant
}: {
  integration?: Integration;
  tenant: Tenant;
}) {
  const token = useDeepMemo(() => [integration, tenant], [integration, tenant]);
  return useSWR(token, getFolder);
}

// see also: https://grafana.com/docs/grafana/latest/http_api/folder/#get-folder-by-uid
export async function getFolder({
  integration,
  tenant
}: FolderProps): Promise<FolderInfo | undefined> {
  return axios({
    method: "get",
    url: makeUrl(tenant, `folders/${makeUuid(integration)}`),
    withCredentials: true
  })
    .then(response => ({
      id: response.data.id,
      path: response.data.url
    }))
    .catch(err => undefined);
}

// see also: https://grafana.com/docs/grafana/latest/http_api/folder/#delete-folder
export async function deleteFolder({
  integration,
  tenant
}: FolderProps): Promise<{
  id: number;
}> {
  const responseData = await request({
    method: "delete",
    url: makeUrl(tenant, `folders/${makeUuid(integration)}`),
    withCredentials: true
  }).then(res => res.data);

  return {
    id: responseData.id
  };
}

type dashboardInfo = {
  // The '/grafana/...' path linking to the dashboard in Grafana.
  path: string;
};

type Dashboard = {
  uid: string;
  dashboard:
    | CDBChangefeedsDashboard
    | CDBDistributedDashboard
    | CDBHardwareDashboard
    | CDBOverviewDashboard
    | CDBQueuesDashboard
    | CDBReplicationDashboard
    | CDBRuntimeDashboard
    | CDBSlowRequestDashboard
    | CDBSqlDashboard
    | CDBStorageDashboard
    | K8sLogsSummaryDashboard
    | K8sMetricsApiServerDashboard
    | K8sMetricsKubeletDashboard
    | K8sMetricsResourceDashboard;
  folderId: number;
  overwrite: boolean;
};

// see also: https://grafana.com/docs/grafana/latest/http_api/dashboard/#create--update-dashboard
export async function createDashboard(
  tenant: Tenant,
  dashboard: Dashboard
): Promise<dashboardInfo> {
  const responseData = await axios({
    method: "post",
    url: makeUrl(tenant, "dashboards/db"),
    data: dashboard,
    withCredentials: true
  }).then(res => res.data);

  return {
    path: responseData.url
  };
}

export const grafanaUrl = ({ tenant }: { tenant: Tenant | string }) => {
  const tenantName = isString(tenant) ? tenant : tenant.name;
  return `${window.location.protocol}//${tenantName}.${window.location.host}`;
};

// Same as AxiosError<{ message: string }>, but with mandatory "response" field.
export interface GrafanaError extends AxiosError<{ message: string }> {
  response: NonNullable<AxiosError<{ message: string }>["response"]>;
}

export const isGrafanaError = (error: Error): error is GrafanaError => {
  if (!axios.isAxiosError(error)) {
    return false;
  }
  return !!error.response?.data?.message;
};
