/**
 * Copyright 2020 Opstrace, Inc.
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

import { GCPAuthOptions, sql_v1beta4 } from "@opstrace/gcp";
import { NewRenderedClusterConfigType } from "./clusterconfig";

export function getCloudSQLConfig(
  ccfg: NewRenderedClusterConfigType,
  gcpAuthOptions: GCPAuthOptions
): sql_v1beta4.Schema$DatabaseInstance {
  if (ccfg.gcp === undefined) {
    throw Error("`gcp` property expected");
  }
  const userLabels = {
    opstrace_cluster_name: ccfg.cluster_name
  };
  return {
    connectionName: ccfg.cluster_name,
    databaseVersion: "POSTGRES_11",
    instanceType: "CLOUD_SQL_INSTANCE",
    name: ccfg.cluster_name,
    project: gcpAuthOptions.credentials.project_id,
    region: ccfg.gcp.region,
    rootPassword: "2020WasQuiteTheYear",
    serviceAccountEmailAddress: gcpAuthOptions.credentials.client_email,
    settings: {
      userLabels,
      // https://cloud.google.com/sql/docs/postgres/create-instance#machine-types
      tier: "db-custom-1-3840",
      ipConfiguration: {
        // Don't assign a public IP
        ipv4Enabled: false,
        // Our resource link for our GKE VPC
        privateNetwork: ccfg.cluster_name,
        requireSsl: false
      }
    }
  };
}
