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

import axios from "axios";
import { isString } from "ramda-adjunct";

import { Tenant } from "state/tenant/types";
import { Integration } from "state/integration/types";

const makeUuid = (integration: Integration) => `i9n-${integration.id}`;
const makeUrl = (tenant: Tenant, path: string) =>
  `${grafanaUrl({ tenant })}/grafana/api/${path}`;

type folderProps = {
  integration: Integration;
  tenant: Tenant;
};

type folderInfo = {
  id: number; // This ID must be included when creating dashboards within the folder.
  urlPath: String; // The '/grafana/...' path linking to the folder in Grafana.
};

// see also: https://grafana.com/docs/grafana/latest/http_api/folder/#create-folder
export async function createFolder({
  integration,
  tenant
}: folderProps): Promise<folderInfo> {
  const responseData = await axios({
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
    urlPath: responseData.url
  };
}

// see also: https://grafana.com/docs/grafana/latest/http_api/folder/#get-folder-by-uid
export async function getFolder({
  integration,
  tenant
}: folderProps): Promise<folderInfo | null> {
  const responseData = await axios({
    method: "get",
    url: makeUrl(tenant, `folders/${makeUuid(integration)}`),
    withCredentials: true
  }).then(res => res.data);

  return {
    id: responseData.id,
    urlPath: responseData.url
  };
}

// see also: https://grafana.com/docs/grafana/latest/http_api/folder/#delete-folder
export async function deleteFolder({
  integration,
  tenant
}: folderProps): Promise<{
  id: number;
}> {
  const responseData = await axios({
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
  urlPath: String;
};

// see also: https://grafana.com/docs/grafana/latest/http_api/dashboard/#create--update-dashboard
export async function createDashboard(
  tenant: Tenant,
  dashboard: object
): Promise<dashboardInfo> {
  const responseData = await axios({
    method: "post",
    url: makeUrl(tenant, "dashboards/db"),
    data: dashboard,
    withCredentials: true
  }).then(res => res.data);

  return {
    urlPath: responseData.url
  };
}

export const grafanaUrl = ({ tenant }: { tenant: Tenant | string }) => {
  const tenantName = isString(tenant) ? tenant : tenant.name;
  return `${window.location.protocol}//${tenantName}.${window.location.host}`;
};
