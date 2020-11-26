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
import { EC2, ELBv2 } from "aws-sdk";
import { log } from "@opstrace/utils";

import {
  getTagFilter,
  getTags,
  throwIfAWSAPIError,
  awsPromErrFilter,
  ec2c,
  elbClient
} from "./util";

import { AWSResource } from "./resource";

class VPCAttrRes extends AWSResource<true> {
  private attrname: string;
  private vpcid: string;
  // overridden in constructor, see below.
  protected rname = "";

  constructor(opstraceClusterName: string, attrname: string, vpcid: string) {
    super(opstraceClusterName);
    this.changeRname(`VPC ${vpcid} attribute ${attrname}`);

    // only allow for allow-listed attrs.
    assert(["enableDnsHostnames", "enableDnsSupport"].includes(attrname));

    this.attrname = attrname;
    this.vpcid = vpcid;
  }

  private async lookup(): Promise<boolean> {
    const result: EC2.DescribeVpcAttributeResult = await awsPromErrFilter(
      ec2c()
        .describeVpcAttribute({
          Attribute: this.attrname,
          VpcId: this.vpcid
        })
        .promise()
    );

    if (this.attrname === "enableDnsHostnames") {
      if (
        result.EnableDnsHostnames &&
        result.EnableDnsHostnames.Value !== true
      ) {
        log.info(
          `${this.rname} setup: attribute not yet true: ${result.EnableDnsHostnames.Value}`
        );
        return false;
      }
      return true;
    }

    if (this.attrname === "enableDnsSupport") {
      if (result.EnableDnsSupport && result.EnableDnsSupport.Value !== true) {
        log.info(
          `${this.rname} setup: attribute not yet true: ${result.EnableDnsSupport.Value}`
        );
        return false;
      }
      return true;
    }

    throw Error("should never get here");
  }

  async tryCreate(): Promise<true> {
    const params: EC2.ModifyVpcAttributeRequest = { VpcId: this.vpcid };

    if (this.attrname === "enableDnsHostnames") {
      params.EnableDnsHostnames = {
        Value: true
      };
    }

    if (this.attrname === "enableDnsSupport") {
      params.EnableDnsSupport = {
        Value: true
      };
    }
    await modifyVpcAttribute(params);
    return true;
  }

  async checkCreateSuccess(): Promise<boolean> {
    return await this.lookup();
  }

  protected async tryDestroy() {
    log.warning("no need to clean up: %s", this.rname);
  }

  protected async checkDestroySuccess(): Promise<true | string> {
    log.warning("no need to clean up: %s", this.rname);
    return true;
  }
}

class VPCRes extends AWSResource<EC2.Vpc, EC2.CreateVpcRequest> {
  protected rname = "vpc";

  // keep state across tryDestroy() iterations
  private vpcidForElbTeardown: string | undefined;

  private async getVpcforCluster(): Promise<EC2.Vpc | false> {
    const result = await awsPromErrFilter(
      ec2c()
        .describeVpcs({ Filters: [getTagFilter(this.ocname)] })
        .promise()
    );

    if (result && result.Vpcs && result.Vpcs.length >= 1) {
      const vpcs = result.Vpcs;
      if (vpcs.length > 1) {
        log.warning(
          "found more than one vpc , inspect manually:\n%s",
          JSON.stringify(vpcs, null, 2)
        );
      }
      return vpcs[0];
    }
    return false;
  }

  protected async tryCreate(params: EC2.CreateVpcRequest): Promise<boolean> {
    // tag-on-create (apply tags atomically with creation)
    params.TagSpecifications = [
      {
        ResourceType: "vpc",
        Tags: getTags(this.ocname)
      }
    ];

    const result: EC2.CreateVpcResult = await awsPromErrFilter(
      ec2c().createVpc(params).promise()
    );

    if (!result || !result.Vpc) {
      throw new Error(
        `VPC creation error? Result object: ${JSON.stringify(result, null, 2)}`
      );
    }

    return true;
  }

  protected async checkCreateSuccess(): Promise<EC2.Vpc | false> {
    const vpc = await this.getVpcforCluster();

    if (vpc === false) {
      return false;
    }

    log.info("vpc state: %s", vpc.State);

    if (vpc.State !== "available") {
      return false;
    }

    return vpc;
  }

  protected async tryDestroy() {
    const vpc = await this.getVpcforCluster();

    if (vpc !== false && this.vpcidForElbTeardown === undefined) {
      // Store VPC ID for subsequent destroy loop iterations.
      this.vpcidForElbTeardown = vpc.VpcId!;
    }

    // if set by this or any previous destroy loop iteration then try to delete
    // elbs, if applicable.
    if (this.vpcidForElbTeardown) {
      const elbs: ELBv2.LoadBalancers = await getELBsAssociatedWithVPC(
        this.vpcidForElbTeardown
      );

      if (elbs.length > 0) {
        this.logElbs(elbs);

        for (const lb of elbs) {
          log.info(
            "vpc teardown: try to delete ELB %s ...",
            lb.LoadBalancerArn
          );
          await awsPromErrFilter(
            elbClient()
              .deleteLoadBalancer({ LoadBalancerArn: lb.LoadBalancerArn! })
              .promise()
          );
        }
      } else {
        // reset state (not necessary, but enables faster exit).
        this.vpcidForElbTeardown = undefined;
      }
    }

    if (vpc !== false) {
      await awsPromErrFilter(ec2c().deleteVpc({ VpcId: vpc.VpcId! }).promise());
    }
  }

  private logElbs(elbs: ELBv2.LoadBalancers) {
    log.warning(
      "ELB(s) found associated with VPC (not torn down during k8s cluster shutdown): %s",
      elbs.map(e => e.LoadBalancerArn)
    );
  }

  protected async checkDestroySuccess(): Promise<true | string> {
    if (this.vpcidForElbTeardown) {
      const elbs: ELBv2.LoadBalancers = await getELBsAssociatedWithVPC(
        this.vpcidForElbTeardown
      );
      if (elbs.length > 0) {
        this.logElbs(elbs);
        return "ELB(s) still present";
      }
    }

    const result = await this.getVpcforCluster();

    if (result === false) {
      return true;
    }

    // string representing state
    return JSON.stringify(result, null, 2);
  }
}

async function getELBsAssociatedWithVPC(
  referenceVpcId: string
): Promise<ELBv2.LoadBalancers> {
  let data: ELBv2.DescribeLoadBalancersOutput;

  try {
    data = await elbClient().describeLoadBalancers().promise();
  } catch (e) {
    throwIfAWSAPIError(e);
    throw e;
  }

  // log.debug(
  //   "getELBsAssociatedWithVPC: data: %s",
  //   JSON.stringify(data, null, 2)
  // );

  if (!data || !data.LoadBalancers) {
    return [];
  }

  const elbs = [];
  for (const lb of data.LoadBalancers) {
    if (lb.VpcId === referenceVpcId) {
      log.info(
        "vpc teardown: found ELB associated with VPC %s: %s",
        referenceVpcId,
        lb.LoadBalancerName
      );
      elbs.push(lb);
    }
  }
  return elbs;
}

async function modifyVpcAttribute(params: EC2.ModifyVpcAttributeRequest) {
  await awsPromErrFilter(ec2c().modifyVpcAttribute(params).promise());
}

export async function createVPC({
  clusterName,
  cidr
}: {
  clusterName: string;
  cidr: string;
}): Promise<EC2.Vpc> {
  const params: EC2.CreateVpcRequest = {
    CidrBlock: cidr
  };

  const vpcres = new VPCRes(clusterName);
  // `setup()` returns the value that `checkCreateSuccess()` returns when it is
  // not undefined.
  const vpc: EC2.Vpc = await vpcres.setup(params);

  await new VPCAttrRes(clusterName, "enableDnsHostnames", vpc.VpcId!).setup();
  await new VPCAttrRes(clusterName, "enableDnsSupport", vpc.VpcId!).setup();

  return vpc;
}

export async function destroyVPC({ clusterName }: { clusterName: string }) {
  await new VPCRes(clusterName).teardown();
}
