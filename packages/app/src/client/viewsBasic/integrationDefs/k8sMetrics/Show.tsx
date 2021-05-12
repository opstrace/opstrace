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

import React from "react";
import { saveAs } from "file-saver";
import axios from "axios";

import { IntegrationProps } from "client/viewsBasic/tenantIntegrations/utils";
import { IntegrationDefProps } from "client/viewsBasic/integrationDefs/utils";

import { withTenantFromParams, TenantProps } from "client/views/tenant/utils";

import { prometheusYaml } from "./templates/config";
import { makePrometheusFolderRequest, makePrometheusDashboardRequests } from "./templates/dashboards";

import { Box } from "client/components/Box";
import Attribute from "client/components/Attribute";
import { Card, CardContent, CardHeader } from "client/components/Card";

type folderInfo = {
  // The numeric ID for the folder that was created (or updated).
  // This ID must be included when creating dashboards within the folder.
  id: number,
  // The '/grafana/...' path linking to the folder in Grafana.
  // Doesn't include the hostname.
  urlPath: String
}

async function createFolder(tenantName: String, folder: object): Promise<folderInfo> {
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
};

type dashboardInfo = {
  // The '/grafana/...' path linking to the dashboard in Grafana.
  // Doesn't include the hostname.
  urlPath: String
}

async function createDashboard(tenantName: String, dashboard: object): Promise<dashboardInfo> {
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

export const K8sMetricsShow = withTenantFromParams(
  ({
    integration,
    integrationDef,
    tenant
  }: IntegrationProps & IntegrationDefProps & TenantProps) => {
    const downloadHandler = () => {
      const config = prometheusYaml({
        clusterName: window.location.host,
        tenantName: tenant.name,
        integrationId: integration.id,
        deployNamespace: integration.data.deployNamespace
      });

      var configBlob = new Blob([config], {
        type: "application/x-yaml;charset=utf-8"
      });
      saveAs(configBlob, "opstrace-monitoring-prometheus.yaml");
    };

    const dashboardHandler = async () => {
      const folder = await createFolder(
        tenant.name,
        makePrometheusFolderRequest({
          integrationId: integration.id,
          integrationName: integration.name
        })
      );
      console.log(`Folder created: id=${folder.id} path=${folder.urlPath}`);

      for (const d of makePrometheusDashboardRequests({
        integrationId: integration.id,
        folderId: folder.id
      })) {
        const result = await createDashboard(tenant.name, d);
        console.log(`Dashboard created: path=${result.urlPath}`);
      };
    };

    return (
      <Box
        width="100%"
        height="100%"
        display="flex"
        justifyContent="center"
        alignItems="center"
        flexWrap="wrap"
        p={1}
      >
        <Box maxWidth={700}>
          <Card>
            <CardHeader
              titleTypographyProps={{ variant: "h5" }}
              title={integration.name}
            />
            <CardContent>
              <Box display="flex">
                <Box display="flex" flexDirection="column">
                  <Attribute.Key>Kind:</Attribute.Key>
                  <Attribute.Key>Category:</Attribute.Key>
                  <Attribute.Key>Status:</Attribute.Key>
                  <Attribute.Key>Created:</Attribute.Key>
                  <Attribute.Key>Config:</Attribute.Key>
                </Box>
                <Box display="flex" flexDirection="column" flexGrow={1}>
                  <Attribute.Value>{integrationDef.kind}</Attribute.Value>
                  <Attribute.Value>{integrationDef.category}</Attribute.Value>
                  <Attribute.Value>{integration.status}</Attribute.Value>
                  <Attribute.Value>{integration.created_at}</Attribute.Value>
                  <Attribute.Value>
                    <button onClick={downloadHandler}>Download</button>
                  </Attribute.Value>
                  <Attribute.Value>
                    <button onClick={dashboardHandler}>Create dashboards</button>
                  </Attribute.Value>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    );
  }
);
