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

import { getTagFilter, getTags, awsPromErrFilter, ec2c } from "./util";
import { AWSResource } from "./resource";

class InternetGatewayRes extends AWSResource<EC2.InternetGateway> {
  protected rname = "internet gateway";

  private async getGatewayForCluster(): Promise<EC2.InternetGateway | false> {
    const result = await awsPromErrFilter(
      ec2c()
        .describeInternetGateways({ Filters: [getTagFilter(this.ocname)] })
        .promise()
    );

    if (
      result &&
      result.InternetGateways &&
      result.InternetGateways.length >= 1
    ) {
      const igws = result.InternetGateways;
      if (igws.length > 1) {
        log.warning(
          "found more than one internet gateway, inspect manually:\n%s",
          JSON.stringify(igws, null, 2)
        );
      }
      return igws[0];
    }
    return false;
  }

  protected async tryCreate() {
    // tag-on-create (apply tags atomically with creation)
    const params = {
      TagSpecifications: [
        {
          ResourceType: "internet-gateway",
          Tags: getTags(this.ocname)
        }
      ]
    };
    const result: EC2.CreateInternetGatewayResult = await awsPromErrFilter(
      ec2c().createInternetGateway(params).promise()
    );
    if (result && result.InternetGateway) {
      //return result.InternetGateway;
      return true;
    }

    // when we see this happening in real world: double-check how this happens,
    // then maybe throw an AWSAPIError
    throw new Error(
      `IG creation error? Result object: ${JSON.stringify(result, null, 2)}`
    );
  }

  protected async checkCreateSuccess(): Promise<EC2.InternetGateway | false> {
    return await this.getGatewayForCluster();
  }

  protected async tryDestroy(): Promise<void> {
    const igw = await this.getGatewayForCluster();
    if (igw === false || igw.InternetGatewayId === undefined) {
      return;
    }
    if (igw.Attachments) {
      for (const atchmnt of igw.Attachments) {
        // `State` is the current state of the attachment. For an internet
        // gateway, the state is available when attached to a VPC; otherwise,
        // this value is not returned

        log.info(
          "igw teardown: attachment state '%s' for vpc %s",
          atchmnt.State,
          atchmnt.VpcId
        );

        if (atchmnt.State === "detached" || !atchmnt.VpcId) {
          continue;
        }

        log.info("igw teardown: detach %s from igw", atchmnt.VpcId);
        await detachInternetGateway({
          InternetGatewayId: igw.InternetGatewayId,
          VpcId: atchmnt.VpcId
        });
      }
    }
    await deleteInternetGateway(igw.InternetGatewayId);
  }

  protected async checkDestroySuccess(): Promise<true | string> {
    const result = await this.getGatewayForCluster();
    if (result === false) {
      return true;
    }

    // string representing state
    return JSON.stringify(result, null, 2);
  }
}

/**
 * Expected to yield `EC2.InternetGateway` upon success.
 */
export async function ensureInternetGatewayExists(
  clusterName: string
): Promise<EC2.InternetGateway> {
  const igr = new InternetGatewayRes(clusterName);
  return await igr.setup();
}

export async function ensureInternetGatewayDoesNotExist(
  clusterName: string
): Promise<void> {
  const igr = new InternetGatewayRes(clusterName);
  return await igr.teardown();
}

async function deleteInternetGateway(InternetGatewayId: string) {
  await awsPromErrFilter(
    ec2c().deleteInternetGateway({ InternetGatewayId }).promise()
  );
}

export const attachInternetGateway = ({
  InternetGatewayId,
  VpcId
}: {
  InternetGatewayId: string;
  VpcId: string;
}): Promise<void> => {
  log.info("attaching Internet Gateway to Vpc %s", VpcId);
  return new Promise((resolve, reject) => {
    ec2c().attachInternetGateway({ VpcId, InternetGatewayId }, err => {
      if (err) {
        if (err.code !== "Resource.AlreadyAssociated") {
          reject(err);
        }
      }
      resolve();
    });
  });
};

async function detachInternetGateway({
  InternetGatewayId,
  VpcId
}: {
  InternetGatewayId: string;
  VpcId: string;
}) {
  await awsPromErrFilter(
    ec2c().detachInternetGateway({ VpcId, InternetGatewayId }).promise()
  );
}
