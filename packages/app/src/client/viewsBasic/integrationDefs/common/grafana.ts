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

import { Tenant } from "state/tenant/types";
import { Integration } from "state/integrations/types";

const makeUuid = (integration: Integration) => `i9n-${integration.id}`;
const makeUrl = (tenant: Tenant, path: string) =>
  `${window.location.protocol}//${tenant.name}.${window.location.host}/grafana/api/${path}`;

type createFolderInfo = {
  // The numeric ID for the folder that was created (or updated).
  // This ID must be included when creating dashboards within the folder.
  id: number;
  // The '/grafana/...' path linking to the folder in Grafana.
  urlPath: String;
};

export async function createFolder(
  integration: Integration,
  tenant: Tenant
): Promise<createFolderInfo> {
  // see also: https://grafana.com/docs/grafana/latest/http_api/folder/#create-folder
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

export async function deleteFolder(
  integration: Integration,
  tenant: Tenant
): Promise<{
  id: number;
}> {
  // see also: https://grafana.com/docs/grafana/latest/http_api/folder/#delete-folder
  const responseData = await axios({
    method: "delete",
    url: makeUrl(tenant, `folders/${integration}`),
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

export async function createDashboard(
  tenant: Tenant,
  dashboard: object
): Promise<dashboardInfo> {
  // see also: https://grafana.com/docs/grafana/latest/http_api/dashboard/#create--update-dashboard
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
