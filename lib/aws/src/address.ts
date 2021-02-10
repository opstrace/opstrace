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
import { strict as assert } from "assert";

import { log } from "@opstrace/utils";

import { getTagFilter, tagResource, ec2c, awsPromErrFilter } from "./util";
import { AWSResource } from "./resource";

export class ElasticIPRes extends AWSResource<EC2.Address> {
  protected rname = "ec2 elastic ip";

  private async getAddrforCluster(): Promise<EC2.Address | false> {
    const result = await awsPromErrFilter(
      ec2c()
        .describeAddresses({ Filters: [getTagFilter(this.ocname)] })
        .promise()
    );

    if (result && result.Addresses && result.Addresses.length >= 1) {
      const adrss = result.Addresses;
      if (adrss.length > 1) {
        log.warning(
          "found more than one address , inspect manually:\n%s",
          JSON.stringify(adrss, null, 2)
        );
      }
      return adrss[0];
    }
    return false;
  }

  protected async tryCreate(): Promise<boolean> {
    const result: EC2.AllocateAddressResult = await awsPromErrFilter(
      ec2c().allocateAddress({ Domain: "vpc" }).promise()
    );

    // tag-on-create is not possible
    log.info("allocated ec2 address, allocation id: %s", result.AllocationId);

    // assume that result.AllocationId is defined (why would it not be?)
    assert(result.AllocationId);
    // todo: enter a try-to-tag-loop, deadline-control that loop
    // do that with a sub class of AWSResource
    // note that if tagResource() fails then the next invocation of tryCreate()
    // will allocate another ip addr.
    await tagResource({
      clusterName: this.ocname,
      resourceId: result.AllocationId
    });
    return true;
  }

  protected async checkCreateSuccess(): Promise<EC2.Address | false> {
    return await this.getAddrforCluster();
  }

  protected async tryDestroy(): Promise<void> {
    const address = await this.getAddrforCluster();
    if (address === false) return;

    // Might get an `AuthFailure: You do not have permission to access the
    // specified resource` which is retryable, shrug. See
    // opstrace-prelaunch/issues/1081
    // expect wrapper to ignore this error
    await awsPromErrFilter(
      ec2c().releaseAddress({ AllocationId: address.AllocationId }).promise()
    );
  }

  protected async checkDestroySuccess(): Promise<true | string> {
    const result = await this.getAddrforCluster();
    if (result === false) {
      return true;
    }

    // string representing state
    return JSON.stringify(result, null, 2);
  }
}

export async function ensureAddressDoesNotExist(
  clusterName: string
): Promise<void> {
  const addr = new ElasticIPRes(clusterName);
  await addr.teardown();
}
