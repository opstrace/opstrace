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

// module for managing the authenticator key set (AKS) in an existing
// Opstrace cluster.

import { EKS } from "aws-sdk";

import { KubeConfig } from "@kubernetes/client-node";

import { log, die } from "@opstrace/utils";

// import {
//   getAllGKEClusters,
//   getGcpProjectId,
//   generateKubeconfigStringForGkeCluster,
//   getGKEKubeconfig
// } from "@opstrace/gcp";

import { generateKubeconfigStringForEksCluster } from "@opstrace/aws";

import * as cli from "./index";
import * as list from "./list";

export async function add(): Promise<void> {
  // if (cli.CLIARGS.cloudProvider == "gcp") {
  //   util.gcpValidateCredFileAndGetDetailOrError();
  //   await listGKEClusters();
  //   return;
  // }

  if (cli.CLIARGS.cloudProvider == "aws") {
    // TODO: use util.awsGetClusterRegion() instead
    log.info("do a lookup across all regions to see if cluster exists");
    const clusters = await list.EKSgetOpstraceClusters();
    if (clusters.length > 0) {
      for (const c of clusters)
        if (c.opstraceClusterName === cli.CLIARGS.clusterName) {
          log.info(
            "cluster `%s` found in AWS region %s",
            c.opstraceClusterName,
            c.awsRegion
          );
          const kubeconfig = EKSgenKubConfigObject(c.awsRegion, c.eksCluster);

          addAuthenticatorKey(kubeconfig);

          // great, success, stop iteration and break out of function
          return;
        }
    }

    die(
      `Opstrace cluster not found across all inspected AWS regions: ${cli.CLIARGS.clusterName}`
    );
  }
}

function EKSgenKubConfigObject(awsregion: string, eksCluster: EKS.Cluster) {
  log.info("generate kubeconfig string for EKS cluster");
  const kstring = generateKubeconfigStringForEksCluster(awsregion, eksCluster);
  const kubeConfig = new KubeConfig();
  log.info("parse kubeconfig string for EKS cluster");
  kubeConfig.loadFromString(kstring);
  return kubeConfig;
}

function addAuthenticatorKey(kubeconfig: KubeConfig) {
  log.info("addAuthenticatorKey() dummy: kubeconfig: %s", kubeconfig);
}
