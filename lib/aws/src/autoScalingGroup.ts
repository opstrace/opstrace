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

import { strict as assert } from "assert";

import { AutoScaling } from "aws-sdk";
import { Subnet } from "./types";
import { log } from "@opstrace/utils";

import { autoScalingClient, awsPromErrFilter } from "./util";
import { AWSResource } from "./resource";

class ASGRes extends AWSResource<
  AutoScaling.AutoScalingGroup,
  AutoScaling.CreateAutoScalingGroupType
> {
  private asgname: string;
  protected rname = "auto-scaling group";

  // Set by tryCreate() to the `MinSize` parameter from ASG creation
  // parameters. Can be used by `checkCreateSuccess()`
  private expectedInstanceCount = 0;

  constructor(opstraceClusterName: string) {
    super(opstraceClusterName);

    // source of truth for generating ASG name based on OCN.
    this.asgname = `${opstraceClusterName}-primary-asg`;
  }

  private async getASGforCluster(): Promise<
    AutoScaling.AutoScalingGroup | false
  > {
    const result = await awsPromErrFilter(
      autoScalingClient()
        .describeAutoScalingGroups({ AutoScalingGroupNames: [this.asgname] })
        .promise()
    );

    if (
      result &&
      result.AutoScalingGroups &&
      result.AutoScalingGroups.length >= 1
    ) {
      const agss = result.AutoScalingGroups;
      if (agss.length > 1) {
        log.warning(
          "found more than one asg, inspect manually:\n%s",
          JSON.stringify(agss, null, 2)
        );
      }
      return agss[0];
    }
    return false;
  }

  private async getScalingActivities(): Promise<AutoScaling.Activities> {
    // https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_DescribeScalingActivities.html
    // request activites for this asg. Note that as of the absence of specific
    // activity IDs, AWS will return "all activities for the past six weeks are
    // described", capped at 100 (as far as I understand docs)
    const result: AutoScaling.ActivitiesType = await awsPromErrFilter(
      autoScalingClient()
        .describeScalingActivities({ AutoScalingGroupName: this.asgname })
        .promise()
    );

    // Not sure if this can happen. Types are blurry.
    if (result.Activities === undefined) {
      return [];
    }

    return result.Activities;
  }

  protected async tryCreate(
    asgCreateParams: AutoScaling.CreateAutoScalingGroupType
  ) {
    // check naming convention
    // note that the deprecation warning doesn't quite make sense, this here
    // _is_ the strict assertion mode, as of how the `assert` module has been
    // imported.
    assert.equal(this.asgname, asgCreateParams.AutoScalingGroupName);
    this.expectedInstanceCount = asgCreateParams.MinSize;
    await awsPromErrFilter(
      autoScalingClient().createAutoScalingGroup(asgCreateParams).promise()
    );
    return true;
  }

  protected async checkCreateSuccess(): Promise<
    AutoScaling.AutoScalingGroup | false
  > {
    const asg = await this.getASGforCluster();
    if (asg === false) return false;

    if (asg.Instances === undefined) {
      log.debug(
        "%s setup: expected `Instances` property. Ignore, proceed.",
        this.rname
      );
      return false;
    }

    const instanceCount = asg.Instances.length;
    log.info(
      "%s setup: EC2 instance count: %s (expected: %s)",
      this.rname,
      instanceCount,
      this.expectedInstanceCount
    );

    const scalingacts: AutoScaling.Activities = await this.getScalingActivities();
    if (scalingacts.length === 0) {
      log.info("%s setup: no scaling activities seen yet", this.rname);
      return false;
    }

    // Get the last activity (the most recent one). From docs: "The scaling
    // activities. Activities are sorted by start time. Activities still in
    // progress are described first."" We just have to see in which order they
    // are sorted, ascending or descending.
    const lastActivity = scalingacts[0];

    let msgsuffix = "";
    if (lastActivity.StatusMessage !== undefined) {
      msgsuffix = ` (StatusMessage: ${lastActivity.StatusMessage})`;
    }

    log.info(
      "%s setup: last scaling activity has status `%s`%s",
      this.rname,
      lastActivity.StatusCode,
      msgsuffix
    );

    if (lastActivity.StatusCode == "Failed") {
      // This for example hits in when the EC2 vCPU limit is hit, statusMessage
      // would then start with "You have requested more vCPU capacity than your
      // current vCPU limit of 32 allo....". That's why its critical to expose
      // the statusMessage to the user. Also see opstrace-prelaunch/issues/1874
      // and opstrace-prelaunch/issues/1880.
      log.warning(
        "%s setup: last scaling activity has status FAILED: %s",
        this.rname,
        lastActivity.StatusMessage
      );
      log.warning(
        "The Auto Scaling group shows a `failed`' scaling event (see above " +
          "for detail). This may have to be resolved through manual " +
          "intervention. To view the current quotas for your account, " +
          "open the Amazon EC2 console at " +
          "https://console.aws.amazon.com/ec2/ and navigate to the " +
          "Limits page. We will keep spinning and retrying here."
      );
    }

    // Desired state: ASG status `successful`, and expected instance count.
    if (lastActivity.StatusCode === "Successful") {
      if (instanceCount === this.expectedInstanceCount) {
        log.info(
          "%s setup: state `Successful` and got expected number of EC2 instances",
          this.rname,
          instanceCount,
          this.expectedInstanceCount
        );
        return asg;
      }
    }

    return false;
  }

  protected async tryDestroy() {
    const params = {
      AutoScalingGroupName: this.asgname,
      // do not wait for instances to terminate
      ForceDelete: true
    };
    await awsPromErrFilter(
      autoScalingClient().deleteAutoScalingGroup(params).promise()
    );
  }

  protected async checkDestroySuccess(): Promise<true | string> {
    const result = await this.getASGforCluster();

    if (result === false) {
      return true;
    }

    // string representing state
    return JSON.stringify(result, null, 2);
  }
}

export async function ensureAutoScalingGroupExists({
  opstraceClusterName,
  subnets,
  maxSize,
  minSize,
  desiredCapacity,
  zone,
  launchConfigurationName
}: {
  opstraceClusterName: string;
  subnets: Subnet[];
  maxSize: number;
  minSize: number;
  desiredCapacity: number;
  zone: string;
  launchConfigurationName: string;
}): Promise<void> {
  const asgname = `${opstraceClusterName}-primary-asg`;

  const asgCreateParams: AutoScaling.CreateAutoScalingGroupType = {
    AutoScalingGroupName: asgname,
    LaunchConfigurationName: launchConfigurationName,
    MaxSize: maxSize,
    MinSize: minSize,
    DesiredCapacity: desiredCapacity,
    AvailabilityZones: [zone],
    // Note(JP) set default tags, too (opstrace_cluster_name)
    Tags: [
      {
        Key: `kubernetes.io/cluster/${opstraceClusterName}`,
        Value: "owned",
        PropagateAtLaunch: true
      }
    ],
    VPCZoneIdentifier: subnets
      .filter(s => s.AvailabilityZone === zone && !s.Public)
      .map(s => s.SubnetId)
      .join(",")
  };

  const asg = new ASGRes(opstraceClusterName);
  await asg.setup(asgCreateParams);
}

export async function destroyAutoScalingGroup(
  opstraceClusterName: string
): Promise<void> {
  const asg = new ASGRes(opstraceClusterName);
  await asg.teardown();
}
