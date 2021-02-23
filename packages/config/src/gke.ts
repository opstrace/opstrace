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

import { GKECluster, GCPAuthOptions } from "@opstrace/gcp";

import { NewRenderedClusterConfigType } from "./clusterconfig";

export function getGKEClusterConfig(
  ccfg: NewRenderedClusterConfigType,
  gcpAuthOptions: GCPAuthOptions
): GKECluster {
  if (ccfg.gcp === undefined) {
    throw Error("`gcp` property expected");
  }

  const additionalGKEresourceLabels = {
    env: ccfg.env_label
  };

  const masterAuthorizedNetworks = [
    {
      displayName: "all",
      cidrBlock: "0.0.0.0/0"
    }
  ];
  const oauthScopes = [
    "https://www.googleapis.com/auth/logging.write",
    "https://www.googleapis.com/auth/monitoring",
    "https://www.googleapis.com/auth/devstorage.read_write",
    "https://www.googleapis.com/auth/ndev.clouddns.readwrite"
  ];

  const clusterLabels = {
    // label values on GKE have pretty strict charset constraints. Rely on
    // prior cluster name validation to be at least equally strict.
    opstrace_cluster_name: ccfg.cluster_name
  };

  // https://cloud.google.com/kubernetes-engine/docs/reference/rest/v1beta1/projects.locations.clusters#Cluster
  return {
    network: ccfg.cluster_name,
    subnetwork: ccfg.cluster_name,
    initialClusterVersion: "1.18", // "1.X": picks the highest valid patch+gke.N patch in the 1.X version
    releaseChannel: {
      channel: "REGULAR"
    },
    loggingService: "none",
    monitoringService: "none",
    privateClusterConfig: {
      enablePrivateNodes: true,
      enablePrivateEndpoint: false,
      masterIpv4CidrBlock: "172.16.0.16/28"
    },
    masterAuthorizedNetworksConfig: {
      enabled: true,
      cidrBlocks: masterAuthorizedNetworks
    },
    ipAllocationPolicy: {
      useIpAliases: true,
      createSubnetwork: false
    },
    resourceLabels: {
      // Field 'cluster.resource_labels.value' must only contain lowercase
      // letters ([a-z]), numeric characters ([0-9]), underscores (_) and
      // dashes (-).
      ...clusterLabels,
      ...additionalGKEresourceLabels
    },
    nodePools: [
      {
        name: "primary",
        initialNodeCount: ccfg.node_count,
        config: {
          machineType: ccfg.gcp.machine_type,
          // maybe in the future: ccfg.preemptible_nodes,
          // opstrace-prelaunch/issues/1668
          preemptible: false,
          metadata: {
            "disable-legacy-endpoints": "true"
          },
          serviceAccount: gcpAuthOptions.credentials.client_email,
          tags: ["opstrace"],
          oauthScopes
        }
      }
    ],
    //
    // Enable workload identity
    // https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
    //
    workloadIdentityConfig: {
      workloadPool: `${gcpAuthOptions.projectId}.svc.id.goog`
    }
  };
}
