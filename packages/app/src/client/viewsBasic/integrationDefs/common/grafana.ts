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

type folderInfo = {
  // The numeric ID for the folder that was created (or updated).
  // This ID must be included when creating dashboards within the folder.
  id: number;
  // The '/grafana/...' path linking to the folder in Grafana.
  // Doesn't include the hostname.
  urlPath: String;
};

async function createFolder(
  tenantName: String,
  folder: object
): Promise<folderInfo> {
  // see also: https://grafana.com/docs/grafana/latest/http_api/folder/#create-folder
  const responseData = await axios({
    method: "post",
    url: `${window.location.protocol}//${tenantName}.${window.location.host}/grafana/api/folders`,
    data: folder,
    withCredentials: true
  }).then(res => res.data);

  return {
    id: responseData.id,
    urlPath: responseData.url
  };
}

type dashboardInfo = {
  // The '/grafana/...' path linking to the dashboard in Grafana.
  // Doesn't include the hostname.
  urlPath: String;
};

async function createDashboard(
  tenantName: String,
  dashboard: object
): Promise<dashboardInfo> {
  // see also: https://grafana.com/docs/grafana/latest/http_api/dashboard/#create--update-dashboard
  const responseData = await axios({
    method: "post",
    url: `${window.location.protocol}//${tenantName}.${window.location.host}/grafana/api/dashboards/db`,
    data: dashboard,
    withCredentials: true
  }).then(res => res.data);

  return {
    urlPath: responseData.url
  };
}

export { createFolder, createDashboard };
