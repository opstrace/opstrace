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

import { NewRenderedClusterConfigType } from "./clusterconfig";

// These are AMIs for k8s 1.18
// Also see opstrace-prelaunch/pull/1941
// and https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html
export const REGION_EKS_AMI_MAPPING: Record<string, string> = {
  "af-south-1": "ami-0dcfa2d757494da7c",
  "eu-north-1": "ami-0a674c329567c6456",
  "ap-south-1": "ami-0b53169adb5906e18",
  "eu-west-3": "ami-02444825d174fbd7b",
  "eu-west-2": "ami-062c2b6eee26e5603",
  "eu-south-1": "ami-0d236a46607b78f5e",
  "eu-west-1": "ami-0ca9e57915fd7e017",
  "ap-northeast-2": "ami-09b14b49f6e5be4a1",
  "me-south-1": "ami-058f6a482ed37d011",
  "ap-northeast-1": "ami-0e9f5606a6d10ffb1",
  "sa-east-1": "ami-0bfae48e8718fde5f",
  "ca-central-1": "ami-0becc01e0dd0dd238",
  "ap-east-1": "ami-0824aac4c54c763d3",
  "ap-southeast-1": "ami-0042bc79e92fb3c8a",
  "ap-southeast-2": "ami-0dadf836fc8220165",
  "eu-central-1": "ami-045e4ecd708ac12ba",
  "us-east-1": "ami-0fae38e27c6113140",
  "us-east-2": "ami-0dc6bc43da1b962d8",
  "us-west-1": "ami-002e04ca6d86d255e",
  "us-west-2": "ami-04f0f3d381d07e0b6",
  "cn-north-1": "ami-0895d337ba82ad034",
  "cn-northwest-1": "ami-0f18cdaf5fc2121bf"
};

export function getAWSConfig(ccfg: NewRenderedClusterConfigType) {
  // Using k3s instead of EKS will wipe a lot of these config options, which is
  // why I'm hardcoding the region, vpc, and subnets for now.
  // EKS has region/zone specific imageId so avoid computing that
  // till we have to.
  // Also, passing in 4 subnets is not cool.

  if (ccfg.aws === undefined) {
    throw Error("`aws` property expected");
  }

  // "Subnets specified must be in at least two different AZs", see below.
  let otherZone: string;
  if (ccfg.aws.zone_suffix === "a") {
    otherZone = "b";
  } else {
    otherZone = "a";
  }

  return {
    k8sVersion: "1.18",
    endpointPublicAccess: true,
    endpointPrivateAccess: true,
    region: ccfg.aws.region,
    zone: `${ccfg.aws.region}${ccfg.aws.zone_suffix}`,
    vpc: {
      CidrBlock: "192.168.0.0/16"
    },
    // Why four subnets? Is that an EKS requirement?
    subnets: [
      {
        CidrBlock: "192.168.0.0/19",
        AvailabilityZone: `${ccfg.aws.region}${ccfg.aws.zone_suffix}`,
        Public: true
      },
      {
        CidrBlock: "192.168.32.0/19",
        AvailabilityZone: `${ccfg.aws.region}${ccfg.aws.zone_suffix}`,
        Public: false
      },
      // Choose a different zone for the other two subnets. Otherwise: EKS
      // cluster setup: tryCreate(): assume that creation failed:
      // InvalidParameterException: Subnets specified must be in at least two
      // different AZs (HTTP status code: 400)
      {
        CidrBlock: "192.168.64.0/19",
        AvailabilityZone: `${ccfg.aws.region}${otherZone}`,
        Public: true
      },
      {
        CidrBlock: "192.168.96.0/19",
        AvailabilityZone: `${ccfg.aws.region}${otherZone}`,
        Public: false
      }
    ],
    masterAuthorizedNetworks: ["0.0.0.0/0"],
    instanceType: ccfg.aws.instance_type,
    imageId: REGION_EKS_AMI_MAPPING[ccfg.aws.region]
  };
}
