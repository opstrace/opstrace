/**
 * Copyright 2019-2021 Opstrace, Inc.
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
    // We've hardcoded the password here for now (and in the @opstrace/config package) to keep the installer
    // idempodent. We could generate this during install and then save the value in a secret, but it
    // would certainly add more complexity to maintain an idempodent install and also introduce a critical
    // failure zone between successful CloudSQL creation and writing the password secret to the cluster.
    // If a failure occured in between those two steps, we would likely not be able to recover without
    // additional steps to reset the password on the postgres instance.
    // The Postgres endpoint is attached to it's own private subnet which is only accessible from within the cluster's VPC.
    // Their is no public endpoint for the CloudSQL instance.
    rootPassword: "2020WasQuiteTheYear",
    serviceAccountEmailAddress: gcpAuthOptions.credentials.client_email,
    settings: {
      userLabels,
      // https://cloud.google.com/sql/docs/postgres/create-instance#machine-types
      tier: "db-custom-2-3840",
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
