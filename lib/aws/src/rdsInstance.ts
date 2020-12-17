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

class RDSInstanceRes extends AWSResource<
  RDS.DBInstance,
  RDS.CreateDBInstanceMessage
> {
  protected rname = "RDS Aurora instance";

  protected async tryCreate(params: RDS.CreateDBInstanceMessage) {
    const result: RDS.CreateDBInstanceResult = await awsPromErrFilter(
      rdsClient().createDBInstance(params).promise()
    );

    if (result && result.DBInstance) {
      return true;
    }
    return false;
  }

  protected async checkCreateSuccess(): Promise<RDS.DBInstance | false> {
    // use legacy `doesRDSInstanceExist()` function here, it has the right
    // logic with respect to the opstrace_cluster_name tag.
    const instance = await doesRDSInstanceExist({
      opstraceDBInstanceName: this.ocname
    });

    if (instance === false) {
      return false;
    }

    log.info("RDS instance status: %s", instance.DBInstanceStatus);

    if (instance.DBInstanceStatus === "available") {
      return instance;
    }

    if (instance.DBInstanceStatus?.toLowerCase() === "failed") {
      log.info(
        "Bad luck: RDS instance creation failed (rare AWS-internal problem)"
      );
      log.info(
        "Tearing down FAILED RDS instance, then creating a new one (same name)"
      );

      // The `FAILED` RDS instance needs to be destroyed before we can retry
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
        .deleteDBInstance({
          DBInstanceIdentifier: this.ocname,
          // Skip final snapshotting of the DB before destroy - we don't care about keeping a snap
          SkipFinalSnapshot: true
        })
        .promise()
    );
  }

  protected async checkDestroySuccess(): Promise<true | string> {
    const instance = await doesRDSInstanceExist({
      opstraceDBInstanceName: this.ocname
    });

    if (instance === false) {
      return true;
    }

    log.info("RDS instance status: %s", instance.DBInstanceStatus);

    // string representing state
    return JSON.stringify(instance, null, 2);
  }
}

async function getInstance(
  dbInstanceIdentifier: string
): Promise<RDS.DBInstance | false> {
  let result: RDS.DBInstanceMessage;
  try {
    result = await awsPromErrFilter(
      rdsClient()
        .describeDBInstances({ DBInstanceIdentifier: dbInstanceIdentifier })
        .promise()
    );
    if (result && result.DBInstances && result.DBInstances.length > 0) {
      return result.DBInstances[0];
    }
    return false;
  } catch (e) {
    if (e instanceof AWSApiError) {
      // well-defined, explicit confirmation that instance does not exist.
      if (e.name == "DBInstanceNotFound") {
        return false;
      }
    }
    throw e;
  }
}

/**
 * Check if RDS instance exists for specific Opstrace instance, matched via name
 * as well as opstrace_cluster_name resource tag. Return RDS.DBInstance type if
 * yes or false if no.
 */
export async function doesRDSInstanceExist({
  opstraceDBInstanceName
}: {
  opstraceDBInstanceName: string;
}): Promise<RDS.DBInstance | false> {
  // see if there is an RDS instance with the RDS instance name matching the
  // Opstrace instance name.
  const instance: RDS.DBInstance | false = await getInstance(
    opstraceDBInstanceName
  );

  if (instance) {
    return instance;
  }

  return false;
}

export async function ensureRDSInstanceExists({
  opstraceDBInstanceName,
  instanceLabels
}: {
  opstraceDBInstanceName: string;
  instanceLabels: { Key: string; Value: string }[];
}): Promise<RDS.DBInstance> {
  const dbCreateParams: RDS.CreateDBInstanceMessage = {
    // current convention: DBInstanceIdentifier matches opstrace cluster name
    DBInstanceIdentifier: opstraceDBInstanceName,
    DBClusterIdentifier: opstraceDBInstanceName,
    Engine: "aurora-postgresql",
    DBInstanceClass: "db.t3.medium",
    Tags: instanceLabels
  };

  return await new RDSInstanceRes(opstraceDBInstanceName).setup(dbCreateParams);
}

export async function destroyRDSInstance(
  opstraceDBInstanceName: string
): Promise<void> {
  return await new RDSInstanceRes(opstraceDBInstanceName).teardown();
}
