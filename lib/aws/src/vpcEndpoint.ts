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

import { EC2 } from "aws-sdk";

import { log } from "@opstrace/utils";
import { getTags, getTagFilter, ec2c, awsPromErrFilter } from "./util";
import { AWSResource } from "./resource";

export class VpcEndpointRes extends AWSResource<
  EC2.VpcEndpoint,
  EC2.CreateVpcEndpointRequest
> {
  // overridden in constructor, see below.
  protected rname = "";
  private endpointName: string;

  constructor(opstraceClusterName: string, endpointName: string) {
    super(opstraceClusterName);

    this.changeRname(`vpc endpoint (${endpointName})`);

    // implement a little bit of a convention here
    assert.equal(endpointName.startsWith(opstraceClusterName), true);

    this.endpointName = endpointName;
  }

  async tryCreate(params: EC2.CreateVpcEndpointRequest): Promise<true> {
    // tag-on-create, see opstrace-prelaunch/issues/1141
    const tags = getTags(this.ocname);
    tags.push({
      Key: "endpoint-name",
      Value: this.endpointName
    });
    params.TagSpecifications = [
      {
        ResourceType: "vpc-endpoint",
        Tags: tags
      }
    ];

    await awsPromErrFilter(ec2c().createVpcEndpoint(params).promise());
    return true;
  }

  protected async checkCreateSuccess(): Promise<EC2.VpcEndpoint | false> {
    return await this.lookup();
  }

  protected async tryDestroy(): Promise<void> {
    const vpe = await this.lookup();
    if (vpe === false) {
      return;
    }

    assert(vpe.VpcEndpointId !== undefined);

    await awsPromErrFilter(
      ec2c()
        .deleteVpcEndpoints({
          VpcEndpointIds: [vpe.VpcEndpointId]
        })
        .promise()
    );
  }

  protected async checkDestroySuccess(): Promise<true | string> {
    const result = await this.lookup();
    if (result === false) {
      return true;
    }
    // string representing state
    return JSON.stringify(result, null, 2);
  }

  private async lookup(): Promise<EC2.VpcEndpoint | false> {
    const result: EC2.DescribeVpcEndpointsResult = await awsPromErrFilter(
      ec2c()
        .describeVpcEndpoints({
          Filters: [
            getTagFilter(this.ocname),
            {
              Name: `tag:endpoint-name`,
              Values: [this.endpointName]
            }
          ]
        })
        .promise()
    );

    if (result && result.VpcEndpoints && result.VpcEndpoints.length >= 1) {
      const vs = result.VpcEndpoints;
      if (vs.length > 1) {
        log.warning(
          "found more than one vpc endpoint, inspect manually:\n%s",
          JSON.stringify(vs, null, 2)
        );
      }
      return vs[0];
    }
    return false;
  }
}
