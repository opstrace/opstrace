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

import { strict as assert } from "assert";

import { EKS, EC2 } from "aws-sdk";
import { log } from "@opstrace/utils";

import { KubeConfig } from "@kubernetes/client-node";

import { getKubeConfig } from "@opstrace/kubernetes";

import {
  eksClient,
  awsPromErrFilter,
  generateKubeconfigStringForEksCluster
} from "./util";
import { AWSApiError } from "./types";
import { AWSResource } from "./resource";

class EKSRes extends AWSResource<EKS.Cluster, EKS.CreateClusterRequest> {
  protected rname = "EKS cluster";

  protected async tryCreate(params: EKS.CreateClusterRequest) {
    const result: EKS.CreateClusterResponse = await awsPromErrFilter(
      eksClient().createCluster(params).promise()
    );

    if (result && result.cluster) {
      return true;
    }
    return false;
  }

  protected async checkCreateSuccess(): Promise<EKS.Cluster | false> {
    // use legacy `doesEKSClusterExist()` function here, it has the right
    // logic with respect to the opstrace_cluster_name tag.
    const cluster = await doesEKSClusterExist({
      opstraceClusterName: this.ocname
    });

    if (cluster === false) {
      return false;
    }

    log.info("EKS cluster status: %s", cluster.status);

    if (cluster.status === "ACTIVE") {
      return cluster;
    }

    if (cluster.status === "FAILED") {
      log.info(
        "Bad luck: EKS cluster creation failed (rare AWS-internal problem)"
      );
      log.info(
        "Tearing down FAILED EKS cluster, then creating a new one (same name)"
      );

      // The `FAILED` EKS cluster needs to be destroyed before we can retry
      // creating one with the same name as before.
      await this.teardown();

      // Issue another CREATE API call in the next setup() iteration.
      this.resetCreationState();
    }

    return false;
  }

  protected async tryDestroy() {
    await awsPromErrFilter(
      eksClient()
        .deleteCluster({
          name: this.ocname
        })
        .promise()
    );
  }

  protected async checkDestroySuccess(): Promise<true | string> {
    const cluster = await doesEKSClusterExist({
      opstraceClusterName: this.ocname
    });

    if (cluster === false) {
      return true;
    }

    log.info("EKS cluster status: %s", cluster.status);

    // string representing state
    return JSON.stringify(cluster, null, 2);
  }
}

async function getCluster(
  eksClusterName: string
): Promise<EKS.Cluster | false> {
  let result;
  try {
    result = await awsPromErrFilter(
      eksClient().describeCluster({ name: eksClusterName }).promise()
    );
    if (result && result.cluster) {
      return result.cluster;
    }
  } catch (e) {
    if (e instanceof AWSApiError) {
      // well-defined, explicit confirmation that cluster does not exist.
      if (e.name == "ResourceNotFoundException") {
        return false;
      }
    }
    throw e;
  }
  // when we see this happening in real world: double-check how this happens.
  throw new Error(
    `unexpected lib behavior. Result object: ${JSON.stringify(result, null, 2)}`
  );
}

/**
 * Check if EKS cluster exists for specific Opstrace cluster, matched via name
 * as well as opstrace_cluster_name resource tag. Return EKS.Cluster type if
 * yes or false if no.
 */
export async function doesEKSClusterExist({
  opstraceClusterName
}: {
  opstraceClusterName: string;
}): Promise<EKS.Cluster | false> {
  // see if there is an EKS cluster with the EKS cluster name matching the
  // Opstrace cluster name.
  const cluster: EKS.Cluster | false = await getCluster(opstraceClusterName);

  // now see if the unambigious resource tag also matches.
  if (cluster) {
    const ocn = cluster.tags?.opstrace_cluster_name;
    if (ocn !== undefined && ocn == opstraceClusterName) {
      return cluster;
    }
    log.warning("eks cluster found without opstrace_cluster_name tag");
  }

  return false;
}

export async function ensureEKSExists({
  subnets,
  opstraceClusterName,
  securityGroupId,
  roleArn,
  endpointPrivateAccess,
  endpointPublicAccess,
  k8sVersion,
  clusterLabels
}: {
  subnets: EC2.Subnet[];
  opstraceClusterName: string;
  securityGroupId: string;
  roleArn: string;
  endpointPublicAccess: boolean;
  endpointPrivateAccess: boolean;
  k8sVersion: string;
  clusterLabels: Record<string, string>;
}): Promise<EKS.Cluster> {
  const subnetIds = subnets.reduce<string[]>(
    (acc, s) => (s.SubnetId ? acc.concat(s.SubnetId) : acc),
    []
  );

  const eksCreateParams: EKS.CreateClusterRequest = {
    version: k8sVersion,
    // current convention: eks cluster name matches opstrace cluster name
    name: opstraceClusterName,
    roleArn,
    tags: clusterLabels,
    resourcesVpcConfig: {
      subnetIds,
      securityGroupIds: [securityGroupId],
      endpointPublicAccess,
      endpointPrivateAccess
    }
  };

  return await new EKSRes(opstraceClusterName).setup(eksCreateParams);
}

export async function destroyEKS(opstraceClusterName: string): Promise<void> {
  return await new EKSRes(opstraceClusterName).teardown();
}

export async function getEKSKubeconfig(
  awsRegion: string,
  clusterName: string
): Promise<KubeConfig | undefined> {
  const eksCluster = await doesEKSClusterExist({
    opstraceClusterName: clusterName
  });
  if (eksCluster === false) {
    log.info(
      "EKS cluster corresponding to Opstrace cluster '%s' does not seem to exist.",
      clusterName
    );
    return undefined;
  }

  // This assert statement might help more than doing
  // `destroyConfig.awsRegion!`.  When we get here this property must not be
  // `undefined`. With the current code paths it won't be, upon refactoring
  // this assert statement is hopefully more useful than the exclamation mark.
  assert(awsRegion);

  const kstring = generateKubeconfigStringForEksCluster(awsRegion, eksCluster);

  // Handle the case where the cluster fails to provision. In this situation we want
  // to proceed with infrastructure cleanup anyway.
  try {
    return getKubeConfig({
      loadFromCluster: false,
      kubeconfig: kstring
    });
  } catch (e) {
    log.warning(
      "Failed to fetch kubeconfig for EKS cluster: %s. Proceeding with infraestructure cleanup.",
      e.message
    );
    return undefined;
  }
}
