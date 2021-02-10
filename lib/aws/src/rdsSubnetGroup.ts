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

import { RDS } from "aws-sdk";

import { log } from "@opstrace/utils";
import { AWSApiError } from "./types";
import { getTags, awsPromErrFilter, rdsClient } from "./util";
import { AWSResource } from "./resource";

export class RDSSubnetGroupRes extends AWSResource<RDS.DBSubnetGroup, void> {
  protected rname = "RDS Subnet group";
  private subnetIds?: string[];

  constructor(opstraceClusterName: string, subnetIds?: string[]) {
    super(opstraceClusterName);
    this.subnetIds = subnetIds;
  }

  private async getSubnetGroup(): Promise<RDS.DBSubnetGroup | false> {
    try {
      const result: RDS.DBSubnetGroupMessage = await awsPromErrFilter(
        rdsClient()
          .describeDBSubnetGroups({ DBSubnetGroupName: this.ocname })
          .promise()
      );

      if (result && result.DBSubnetGroups && result.DBSubnetGroups.length > 0) {
        return result.DBSubnetGroups[0];
      }
      return false;
    } catch (e) {
      if (e instanceof AWSApiError) {
        // well-defined, explicit confirmation that instance does not exist.
        if (e.name == "DBSubnetGroupNotFoundFault") {
          return false;
        }
      }
      throw e;
    }
  }

  protected async tryCreate(): Promise<true> {
    // tag-on-create (apply tags atomically with creation)
    const tags = getTags(this.ocname);

    if (!this.subnetIds) {
      throw Error("no subnetIds provided");
    }
    log.info("creating subnet group");

    const result: RDS.CreateDBSubnetGroupResult = await awsPromErrFilter(
      rdsClient()
        .createDBSubnetGroup({
          DBSubnetGroupName: this.ocname,
          DBSubnetGroupDescription: "RDS Subnet Group for Opstrace cluster",
          SubnetIds: this.subnetIds,
          Tags: tags
        })
        .promise()
    );

    if (result && result.DBSubnetGroup) {
      return true;
    }

    // When we see this happening in real world: double-check how this happens,
    // then maybe throw an AWSAPIError
    throw new Error(
      `RDS Subnet Group creation error? Result object: ${JSON.stringify(
        result,
        null,
        2
      )}`
    );
  }

  protected async checkCreateSuccess(): Promise<RDS.DBSubnetGroup | false> {
    const sg = await this.getSubnetGroup();
    if (sg === false) {
      return false;
    }

    log.info("RDS Subnet Group status: %s", sg.SubnetGroupStatus);

    if (sg.SubnetGroupStatus === "Complete") {
      return sg;
    }

    return false;
  }

  protected async tryDestroy(): Promise<void> {
    const sg = await this.getSubnetGroup();
    if (sg === false) {
      return;
    }

    if (sg.DBSubnetGroupName === undefined) {
      log.warning(
        "unexpected state: tryDestroy() rds subnet group: %s",
        JSON.stringify(sg, null, 2)
      );
      return;
    }

    await awsPromErrFilter(
      rdsClient()
        .deleteDBSubnetGroup({
          DBSubnetGroupName: sg.DBSubnetGroupName
        })
        .promise()
    );
  }

  protected async checkDestroySuccess(): Promise<true | string> {
    const sg = await this.getSubnetGroup();
    if (sg === false) {
      return true;
    }

    log.info("RDS Subnet Group state: %s", sg.SubnetGroupStatus);

    if (sg.SubnetGroupStatus === "failed") {
      log.info(
        "RDS Subnet Group in `failed` state is automatically deleted by AWS within ~1 hour"
      );
      return true;
    }

    if (sg.SubnetGroupStatus === "deleted") {
      return true;
    }

    if (sg.SubnetGroupStatus === "deleting") {
      return "still deleting";
    }

    // string representing state
    return JSON.stringify(sg, null, 2);
  }
}
