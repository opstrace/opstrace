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

import { EC2 } from "aws-sdk";

import { log } from "@opstrace/utils";

import { getTags, getTagFilter, ec2c, awsPromErrFilter } from "./util";
import { AWSResource } from "./resource";
import { AWSApiError } from "./types";

type RTType = "publicRouteTable" | "privateRouteTable";

abstract class RouteTableRes extends AWSResource<EC2.RouteTable, string> {
  protected abstract rttype: RTType;

  private async lookup(): Promise<EC2.RouteTable | false> {
    const result = await awsPromErrFilter(
      ec2c()
        .describeRouteTables({
          Filters: [
            getTagFilter(this.ocname),
            {
              Name: `tag:opstrace-route-table-type`,
              Values: [this.rttype]
            }
          ]
        })
        .promise()
    );

    if (result && result.RouteTables && result.RouteTables.length >= 1) {
      const rts = result.RouteTables;
      if (rts.length > 1) {
        log.warning(
          "found more than one route table, inspect manually:\n%s",
          JSON.stringify(rts, null, 2)
        );
      }
      return rts[0];
    }
    return false;
  }

  async tryCreate(vpcid: string) {
    // get default resource tags, then add custom tags
    const tags = getTags(this.ocname);
    tags.push({
      Key: "opstrace-route-table-type",
      Value: this.rttype
    });

    const reqobj: EC2.CreateRouteTableRequest = {
      VpcId: vpcid,
      TagSpecifications: [
        {
          ResourceType: "route-table",
          Tags: tags
        }
      ]
    };

    const result: EC2.CreateRouteTableResult = await awsPromErrFilter(
      ec2c().createRouteTable(reqobj).promise()
    );
    if (result && result.RouteTable) {
      return true;
    }

    // when we see this happening in real world: double-check how this happens,
    // then maybe throw an AWSAPIError
    throw new Error(
      `RT creation error? Result object: ${JSON.stringify(result, null, 2)}`
    );
  }

  async checkCreateSuccess(): Promise<EC2.RouteTable | false> {
    return await this.lookup();
  }

  async tryDestroy(): Promise<void> {
    const rt = await this.lookup();
    if (rt === false) return;

    // "You must disassociate the route table from any subnets before you can
    // delete it. You can't delete the main route table."
    if (rt.Associations) {
      for (const asso of rt.Associations) {
        const aid = asso.RouteTableAssociationId;
        if (!aid) {
          continue;
        }
        log.info(`${this.rname}: try to disassociateRouteTable(${aid})`);
        await disassociateRouteTable({
          AssociationId: aid
        });
      }
    }

    log.info("try to delete route table: %s", rt.RouteTableId);
    if (rt.RouteTableId) {
      await deleteRouteTable({
        RouteTableId: rt.RouteTableId
      });
    }
  }

  protected async checkDestroySuccess(): Promise<true | string> {
    const result = await this.lookup();
    if (result === false) {
      return true;
    }

    // string representing state
    return JSON.stringify(result, null, 2);
  }
}

export class RouteTablePrivateRes extends RouteTableRes {
  protected rname = "route table (private)";
  protected rttype = "privateRouteTable" as RTType;
}

export class RouteTablePublicRes extends RouteTableRes {
  protected rname = "route table (public)";
  protected rttype = "publicRouteTable" as RTType;
}

export class RouteRes extends AWSResource<true> {
  protected rname = "";
  private cparams: EC2.CreateRouteRequest;

  constructor(opstraceClusterName: string, cparams: EC2.CreateRouteRequest) {
    super(opstraceClusterName);
    this.cparams = cparams;
    this.changeRname(`route (${JSON.stringify(cparams)})`);
  }

  async tryCreate(): Promise<boolean> {
    await awsPromErrFilter(ec2c().createRoute(this.cparams).promise());
    return true;
  }

  async checkCreateSuccess(): Promise<true> {
    // Ideally, use `DescribeRouteTables` and find this route explicitly.
    // (AWSEC2/latest/APIReference/API_DescribeRouteTables.html). But it seems
    // like we can also short-cut this and rely on "create confirmation". Note
    // that the current setup() implementation calls checkCreateSuccess()
    // before calling tryCreate()
    try {
      await awsPromErrFilter(ec2c().createRoute(this.cparams).promise());
    } catch (e) {
      if (e instanceof AWSApiError) {
        // Well-defined, explicit confirmation that route already exists. Note
        // that this is thrown when the target is given by NatGatewayId.
        if (e.name == "RouteAlreadyExists") {
          return true;
        }
      }
      // Rethrow any error that's not the RouteAlreadyExists error, indicating
      // creation failure.
      throw e;
    }
    // When the target is provided via GatewayId (internet gateway) then the
    // creation will always be 200-acked, even if the route already exists.
    return true;
  }

  // AWS uninstaller does not destroy these explicitly: assume that they are
  // destroyed implicitly. Plan for `.teardown()` to not get called, i.e.
  // the destruction methods can be noops.
  async checkDestroySuccess(): Promise<true | string> {
    throw Error("not implemented");
  }

  async tryDestroy(): Promise<void> {
    throw Error("not implemented");
  }
}

export async function associateRouteTable({
  RouteTableId,
  SubnetId
}: {
  RouteTableId: string;
  SubnetId: string;
}): Promise<void> {
  await awsPromErrFilter(
    ec2c().associateRouteTable({ RouteTableId, SubnetId }).promise()
  );
}

export async function deleteRouteTable({
  RouteTableId
}: {
  RouteTableId: string;
}): Promise<void> {
  await awsPromErrFilter(ec2c().deleteRouteTable({ RouteTableId }).promise());
}

export async function disassociateRouteTable({
  AssociationId
}: {
  AssociationId: string;
}): Promise<void> {
  await awsPromErrFilter(
    ec2c().disassociateRouteTable({ AssociationId }).promise()
  );
}
