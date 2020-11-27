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

import { RDS } from "aws-sdk";
import { log } from "@opstrace/utils";

import { rdsClient, awsPromErrFilter } from "./util";
import { AWSApiError } from "./types";
import { AWSResource } from "./resource";

class RDSClusterRes extends AWSResource<
  RDS.DBCluster,
  RDS.CreateDBClusterMessage
> {
  protected rname = "RDS Aurora cluster";

  protected async tryCreate(params: RDS.CreateDBClusterMessage) {
    const result: RDS.CreateDBClusterResult = await awsPromErrFilter(
      rdsClient().createDBCluster(params).promise()
    );

    if (result && result.DBCluster) {
      return true;
    }
    return false;
  }

  protected async checkCreateSuccess(): Promise<RDS.DBCluster | false> {
    // use legacy `doesRDSClusterExist()` function here, it has the right
    // logic with respect to the opstrace_cluster_name tag.
    const cluster = await doesRDSClusterExist({
      opstraceDBClusterName: this.ocname
    });

    if (cluster === false) {
      return false;
    }

    log.info("RDS cluster status: %s", cluster.Status);

    if (cluster.Status === "available") {
      return cluster;
    }

    if (cluster.Status?.toLowerCase() === "failed") {
      log.info(
        "Bad luck: RDS cluster creation failed (rare AWS-internal problem)"
      );
      log.info(
        "Tearing down FAILED RDS cluster, then creating a new one (same name)"
      );

      // The `FAILED` RDS cluster needs to be destroyed before we can retry
      // creating one with the same name as before.
      await this.teardown();

      // Issue another CREATE API call in the next setup() iteration.
      this.resetCreationState();
    }

    return false;
  }

  protected async tryDestroy() {
    await awsPromErrFilter(
      rdsClient()
        .deleteDBCluster({
          DBClusterIdentifier: this.ocname,
          // Skip final snapshotting of the DB before destroy - we don't care about keeping a snap
          SkipFinalSnapshot: true
        })
        .promise()
    );
  }

  protected async checkDestroySuccess(): Promise<true | string> {
    const cluster = await doesRDSClusterExist({
      opstraceDBClusterName: this.ocname
    });

    if (cluster === false) {
      return true;
    }

    log.info("RDS cluster status: %s", cluster.Status);

    // string representing state
    return JSON.stringify(cluster, null, 2);
  }
}

async function getCluster(
  dbClusterIdentifier: string
): Promise<RDS.DBCluster | false> {
  let result: RDS.DBClusterMessage;
  try {
    result = await awsPromErrFilter(
      rdsClient()
        .describeDBClusters({ DBClusterIdentifier: dbClusterIdentifier })
        .promise()
    );
    if (result && result.DBClusters && result.DBClusters.length > 0) {
      return result.DBClusters[0];
    } else {
      return false;
    }
  } catch (e) {
    if (e instanceof AWSApiError) {
      // well-defined, explicit confirmation that cluster does not exist.
      if (e.name == "DBClusterNotFoundFault") {
        return false;
      }
    }
    throw e;
  }
}

/**
 * Check if RDS cluster exists for specific Opstrace cluster, matched via name
 * as well as opstrace_cluster_name resource tag. Return RDS.DBCluster type if
 * yes or false if no.
 */
export async function doesRDSClusterExist({
  opstraceDBClusterName
}: {
  opstraceDBClusterName: string;
}): Promise<RDS.DBCluster | false> {
  // see if there is an RDS cluster with the RDS cluster name matching the
  // Opstrace cluster name.
  const cluster: RDS.DBCluster | false = await getCluster(
    opstraceDBClusterName
  );

  if (cluster) {
    return cluster;
  }

  return false;
}

export async function ensureRDSClusterExists({
  opstraceDBClusterName,
  securityGroupId,
  subnetGroupName,
  clusterLabels
}: {
  opstraceDBClusterName: string;
  securityGroupId: string;
  subnetGroupName: string;
  clusterLabels: { Key: string; Value: string }[];
}): Promise<RDS.DBCluster> {
  const dbCreateParams: RDS.CreateDBClusterMessage = {
    // current convention: DBClusterIdentifier matches opstrace cluster name
    DBClusterIdentifier: opstraceDBClusterName,
    Engine: "aurora-postgresql",
    EngineVersion: "11.8",
    EngineMode: "provisioned",
    CopyTagsToSnapshot: true,
    DatabaseName: "opstrace",
    Tags: clusterLabels,
    DBSubnetGroupName: subnetGroupName,
    VpcSecurityGroupIds: [securityGroupId],
    // Just a reminder that this cluster is not exposed to the internet.
    // The Opstrace securityGroupId is the only way in.
    MasterUsername: "opstrace",
    MasterUserPassword: "2020WasQuiteTheYear"
  };

  return await new RDSClusterRes(opstraceDBClusterName).setup(dbCreateParams);
}

export async function destroyRDSCluster(opstraceDBClusterName: string) {
  return await new RDSClusterRes(opstraceDBClusterName).teardown();
}
