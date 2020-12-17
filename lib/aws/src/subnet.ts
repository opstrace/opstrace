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
import { delay, call } from "redux-saga/effects";
import { strict as assert } from "assert";

import { SECOND, log } from "@opstrace/utils";

import { Subnet, AWSApiError, PickRequired } from "./types";
import { getTagFilter, getTags, awsPromErrFilter, ec2c } from "./util";
import { CreateSubnetRequest } from "aws-sdk/clients/ec2";

async function getSubnets(
  clusterName: string
): Promise<EC2.Subnet[] | undefined> {
  const result = await awsPromErrFilter(
    ec2c()
      .describeSubnets({ Filters: [getTagFilter(clusterName)] })
      .promise()
  );

  return result.Subnets;
}

/**
 * Create subnet and return promise to EC2.Subnet or throw an error.
 */
async function createSubnet(
  subnet: EC2.CreateSubnetRequest
): Promise<EC2.Subnet> {
  const result = await awsPromErrFilter(ec2c().createSubnet(subnet).promise());

  if (result && result.Subnet) {
    return result.Subnet;
  }

  // when we see this happening in real world: double-check how this happens,
  // then maybe throw an AWSAPIError
  throw new Error(
    `Subnet creation error? Result object: ${JSON.stringify(result, null, 2)}`
  );
}

async function deleteSubnet(subnetId: string) {
  log.debug("deleteSubnet(): %s", subnetId);
  await awsPromErrFilter(ec2c().deleteSubnet({ SubnetId: subnetId }).promise());
}

/**
 * Construct resource tags, build subnet creation parameter object, ire off
 * subnet creation API request.
 *
 * Log success or error case, return `undefined`.
 *
 * (for now, do not keep track of a success response to a creation request,
 * assume that the next subnet LIST request is consistent with a previous
 * CREATE request -- note that for other resources we put more effort into not
 * accidentally creating them twice, but maybe that's not needed here!)
 */
function* createSubnetWithTags(
  vpc: EC2.Vpc,
  sntc: PickRequired<Subnet, "CidrBlock">,
  clusterName: string
) {
  // Set resource tags within the resource creation request to have
  // those tags apply atomically with creation.
  const snettags: EC2.TagList = getTags(clusterName);

  // Note(JP): what's this special ingredient important for?
  if (sntc.Public) {
    snettags.push({ Key: "kubernetes.io/role/elb", Value: "1" });
  } else {
    snettags.push({ Key: "kubernetes.io/role/internal-elb", Value: "1" });
  }

  // Ideally next resources should be always defined by the time we call this piece.
  assert(vpc.VpcId !== undefined);

  const snetCreateParams: CreateSubnetRequest = {
    CidrBlock: sntc.CidrBlock,
    AvailabilityZone: sntc.AvailabilityZone,
    VpcId: vpc.VpcId,
    TagSpecifications: [
      {
        ResourceType: "subnet",
        Tags: snettags
      }
    ]
  };

  let snet: EC2.Subnet;
  try {
    snet = yield call(createSubnet, snetCreateParams);
    log.info(
      "subnet creation: %s/%s: AWS API success response. Subnet state: %s)",
      snetCreateParams.CidrBlock,
      snet.SubnetId,
      snet.State
    );
    return;
  } catch (e) {
    // Paradigm: retry all `AWSApiError`s. Note that this includes the "not
    // found" kind of errors. This is fine because there is a definite exit
    // criterion for the subnet creation phase (which might never be reached,
    // in which case there is a supervisor that applies timeout control).
    if (!(e instanceof AWSApiError)) {
      throw e;
    }

    log.info(
      "subnet creation: %s: AWS API error: %s",
      snetCreateParams.CidrBlock,
      e.message
    );
    return;
  }
}

export function* ensureSubnetsExist({
  vpc,
  name,
  nameTag,
  subnets
}: {
  vpc: EC2.Vpc;
  name: string;
  nameTag?: string;
  subnets: Subnet[];
}): Generator<unknown, Subnet[], Subnet[]> {
  // Note(JP): towards making clear what name that is.
  const clusterName = name;

  log.info("creating subnets");
  while (true) {
    const existingSubnets: Subnet[] = yield call(getSubnets, clusterName);

    const subnetsToCreate = subnets
      .filter(s => !existingSubnets.find(e => s.CidrBlock === e.CidrBlock))
      .map((s, i) => ({ ...s, Name: `${name}-${i}${nameTag}` }));

    for (const sntc of subnetsToCreate) {
      if (!sntc.CidrBlock) {
        throw Error(`No CidrBlock specified for subnet`);
      }

      if (!sntc.AvailabilityZone) {
        throw Error(`No AvailabilityZone specified for subnet`);
      }

      yield call(
        createSubnetWithTags,
        vpc,
        sntc as PickRequired<Subnet, "CidrBlock" | "AvailabilityZone">,
        clusterName
      );
    }

    const readySubnets = existingSubnets.filter(
      s =>
        s.State === "available" &&
        subnets.find(e => s.CidrBlock === e.CidrBlock)
    );

    const subnetPublic: { [key: string]: boolean } = subnets.reduce(
      (a, s) => ({ ...a, [s.CidrBlock as string]: s.Public }),
      {}
    );

    readySubnets.forEach(subnet => {
      subnet.Public = !!subnet.CidrBlock && subnetPublic[subnet.CidrBlock];
    });

    if (readySubnets.length === subnets.length) {
      return readySubnets;
    }

    yield delay(1 * SECOND);
  }
}

/**
 *
 * @param clusterName: the Opstrace cluster name
 */
export function* ensureSubnetsDoNotExist(
  clusterName: string
): Generator<unknown, void, Subnet[]> {
  log.info("Initiating subnet teardown");

  const delaySeconds = 20;
  let cycle = 0;
  while (true) {
    cycle++;

    const existing: Subnet[] = yield call(getSubnets, clusterName);

    log.debug(
      "subnet teardown: subnets found that appear to belong to cluster: %s ",
      existing.map(s => s.SubnetId)
    );
    if (existing.length === 0) {
      log.info("subnet teardown: reached desired state, done");
      break;
    }

    log.debug("subnet teardown: cycle %s", cycle);

    // Try to sequentially delete the subnets found above.
    for (const snet of existing) {
      if (!snet.SubnetId) {
        // Note(JP): I couldn't grasp which case really is handled by this. A
        // subnet that exists and doesn't exist at the same time?
        continue;
      }

      try {
        yield call(deleteSubnet, snet.SubnetId);
      } catch (e) {
        // Paradigm: retry all `AWSApiError`s. Note that this includes the
        // "not found" kind of errors. This is fine because there is a definite
        // exit criterion further above: the target count of listed subnets.
        if (!(e instanceof AWSApiError)) {
          throw e;
        }

        log.info(
          "subnet teardown: AWS API error in response to trying to delete %s: %s",
          snet.SubnetId,
          e.message
        );
      }
    }

    // In the first cycle go straight to checking for success criterion at the
    // head of the loop body.
    if (cycle > 1) {
      log.debug(
        "subnet teardown: cycle %s done, sleep %s s",
        cycle,
        delaySeconds
      );
      yield delay(delaySeconds * SECOND);
    }
  }
}
