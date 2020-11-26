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

import { EC2 } from "aws-sdk";

import { log } from "@opstrace/utils";

import { getTagFilter, getTags, awsPromErrFilter, ec2c } from "./util";
import { AWSResource } from "./resource";

export class NatGatewayRes extends AWSResource<
  EC2.NatGateway,
  EC2.CreateNatGatewayRequest
> {
  protected rname = "NAT gateway";

  private async getGatewayForCluster(): Promise<EC2.NatGateway | false> {
    const result: EC2.DescribeNatGatewaysResult = await awsPromErrFilter(
      ec2c()
        .describeNatGateways({ Filter: [getTagFilter(this.ocname)] })
        .promise()
    );

    if (!result || !result.NatGateways || result.NatGateways.length == 0) {
      return false;
    }

    const ngws = result.NatGateways;

    for (const ng of ngws) {
      log.debug("NG %s: state %s", ng.NatGatewayId!, ng.State!);
    }

    if (ngws.length == 1) {
      // Return, regardless of state (incl DELETING, DELETED, FAILED)
      // Happy path: most scenarios.
      return ngws[0];
    }

    // An NG may fail during creation. Then another creation is triggered. Then
    // there's more than one cluster-associated NG -- and we need to make a
    // rather deliberate choice about which one to pass on to tryCreate() etc.
    const notDeleted = ngws.filter(ng => ng.State !== "deleted");
    const failed = ngws.filter(ng => ng.State === "failed");
    const ongoing = ngws.filter(
      ng => !["failed", "deleted"].includes(ng.State!)
    );

    // If state management is done 'right' then there should never be more
    // than one NG that is creating / available / deleting.
    if (ongoing.length > 1) {
      log.warning(
        "found more than one NAT gateway in creating / available / deleting state:\n%s",
        JSON.stringify(ongoing, null, 2)
      );
    }
    if (ongoing.length >= 1) {
      return ongoing[0];
    }

    // If all non-deleted are failed: probably still in the setup() loop, and
    // maybe two or more FAILED creations in a row. tryCreate should see a
    // failed one so that it re-inits creation.
    if (notDeleted.length == failed.length && failed.length > 0) {
      log.info(
        "all cluster-associated NGs are deleted or failed, return a `failed` one"
      );
      return failed[0];
    }
    return false;
  }

  protected async tryCreate(
    params: EC2.CreateNatGatewayRequest
  ): Promise<true> {
    // tag-on-create (apply tags atomically with creation)
    const tags = getTags(this.ocname);
    params.TagSpecifications = [
      {
        ResourceType: "natgateway",
        Tags: tags
      }
    ];

    const result: EC2.CreateNatGatewayResult = await awsPromErrFilter(
      ec2c().createNatGateway(params).promise()
    );

    // No error does not seem to imply success? See opstrace-prelaunch/issues/1058.
    if (result && result.NatGateway) {
      return true;
    }

    // When we see this happening in real world: double-check how this happens,
    // then maybe throw an AWSAPIError
    throw new Error(
      `NG creation error? Result object: ${JSON.stringify(result, null, 2)}`
    );
  }

  protected async checkCreateSuccess(): Promise<EC2.NatGateway | false> {
    const ng = await this.getGatewayForCluster();
    if (ng === false) {
      return false;
    }

    log.info("NATGateway state: %s", ng.State);

    if (ng.State === "available") {
      log.info("NATGateway ID: %s", ng.NatGatewayId);
      return ng;
    }

    if (ng.State === "failed") {
      // Handle FAILED creation
      log.info(
        "Bad luck: NATGateway creation failed (rare AWS-internal problem): %s: %s",
        ng.FailureCode,
        ng.FailureMessage
      );

      log.info("Rollback: tear down FAILED gateway, then create a new one");

      await this.teardown();

      // Roll back. Issue another CREATE API call in the next iteration.
      this.resetCreationState();
    }

    return false;
  }

  protected async tryDestroy(): Promise<void> {
    const ng = await this.getGatewayForCluster();
    if (ng === false) {
      return;
    }

    if (ng.NatGatewayId === undefined) {
      log.warning(
        "unexpected state: tryDestroy() natgateway: %s",
        JSON.stringify(ng, null, 2)
      );
      return;
    }

    await awsPromErrFilter(
      ec2c()
        .deleteNatGateway({
          NatGatewayId: ng.NatGatewayId
        })
        .promise()
    );
  }

  protected async checkDestroySuccess(): Promise<true | string> {
    const ng = await this.getGatewayForCluster();
    if (ng === false) {
      return true;
    }

    log.info("NATGateway state: %s", ng.State);

    // Note(JP): can a failed NAT Gateway transition into the deleting ->
    // deleted state? Still not sure, but AWS says that they delete `failed`
    // NAT Gateways after about 1 hour.
    if (ng.State === "failed") {
      log.info(
        "NATGateway in `failed` state is automatically deleted by AWS within ~1 hour"
      );
      return true;
    }

    if (ng.State === "deleted") {
      return true;
    }

    if (ng.State === "deleting") {
      return "still deleting";
    }

    // string representing state
    return JSON.stringify(ng, null, 2);
  }
}
