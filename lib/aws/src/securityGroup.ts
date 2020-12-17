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
import { getTags, ec2c, awsPromErrFilter } from "./util";

import { SECOND, log } from "@opstrace/utils";

import { AWSApiError } from "./types";

/**
 * Strip empty array fields from EC2.IpPermission before making an api request to revoke permission
 * @param IpPermissions
 */
const stripEmptyArrayFields = (IpPermissions: EC2.IpPermissionList) =>
  // Unfortunately this error describes the behavior we see: https://github.com/aws/aws-sdk-ruby/issues/1716
  // Without stripping the empty array fields, we get the following error:
  // error: missing mandatory parameter: exactly one of remote-security-group, remote-ip-range, remote-ipv6-range, or prefix-list-id must be present.
  // Below we do https://github.com/aws/aws-sdk-ruby/issues/1716#issuecomment-368685226
  IpPermissions.map<EC2.IpPermission>(perm => {
    const strippedIpPerm = { ...perm };
    if (strippedIpPerm.IpRanges && !strippedIpPerm.IpRanges.length) {
      delete strippedIpPerm["IpRanges"];
    }
    if (strippedIpPerm.PrefixListIds && !strippedIpPerm.PrefixListIds.length) {
      delete strippedIpPerm["PrefixListIds"];
    }
    if (strippedIpPerm.Ipv6Ranges && !strippedIpPerm.Ipv6Ranges.length) {
      delete strippedIpPerm["Ipv6Ranges"];
    }
    // https://stackoverflow.com/questions/51718009/aws-revokesecuritygroupingress-within-a-vpc
    if (
      strippedIpPerm.UserIdGroupPairs &&
      !strippedIpPerm.UserIdGroupPairs.length
    ) {
      delete strippedIpPerm["UserIdGroupPairs"];
    }

    return strippedIpPerm;
  });

const getSecurityGroup = async ({
  GroupName
}: {
  GroupName: string;
}): Promise<EC2.SecurityGroup | undefined> => {
  return new Promise((resolve, reject) => {
    ec2c().describeSecurityGroups({}, (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(
        data.SecurityGroups &&
          data.SecurityGroups.find(r => r.GroupName === GroupName)
      );
    });
  });
};

/**
 * Create SG (return promise to `EC2.SecurityGroup`) or throw an error.
 */
async function createSecurityGroup(
  clusterName: string,
  params: EC2.CreateSecurityGroupRequest
): Promise<EC2.SecurityGroup> {
  // tag-on-create (apply tags atomically with creation)
  params.TagSpecifications = [
    {
      ResourceType: "security-group",
      Tags: getTags(clusterName)
    }
  ];

  const result: EC2.CreateSecurityGroupResult = await awsPromErrFilter(
    ec2c().createSecurityGroup(params).promise()
  );

  return { GroupName: params.GroupName, GroupId: result.GroupId };
}

async function deleteSecurityGroup(
  securityGroup: EC2.DeleteSecurityGroupRequest
) {
  return await awsPromErrFilter(
    ec2c().deleteSecurityGroup({ GroupId: securityGroup.GroupId }).promise()
  );
}

export const authorizeSecurityGroupEgress = ({
  Rule
}: {
  Rule: EC2.AuthorizeSecurityGroupEgressRequest;
}): Promise<void> => {
  return new Promise((resolve, reject) => {
    ec2c().authorizeSecurityGroupEgress(Rule, err => {
      if (err) {
        if (err.code === "InvalidPermission.Duplicate") {
          resolve();
        }
        reject(err);
      }
      resolve();
    });
  });
};

export const revokeSecurityGroupEgress = ({
  GroupId,
  IpPermissions
}: {
  GroupId: string;
  IpPermissions: EC2.IpPermissionList;
}): Promise<void> => {
  return new Promise((resolve, reject) => {
    ec2c().revokeSecurityGroupEgress(
      {
        IpPermissions: stripEmptyArrayFields(IpPermissions),
        GroupId
      },
      err => {
        if (err) {
          reject(err);
        }
        resolve();
      }
    );
  });
};

export const authorizeSecurityGroupIngress = ({
  Rule
}: {
  Rule: EC2.AuthorizeSecurityGroupIngressRequest;
}): Promise<void> => {
  return new Promise((resolve, reject) => {
    ec2c().authorizeSecurityGroupIngress(Rule, err => {
      if (err) {
        if (err.code === "InvalidPermission.Duplicate") {
          resolve();
        }
        reject(err);
      }
      resolve();
    });
  });
};

export const revokeSecurityGroupIngress = ({
  GroupId,
  IpPermissions
}: {
  GroupId: string;
  IpPermissions: EC2.IpPermissionList;
}): Promise<void> => {
  return new Promise((resolve, reject) => {
    ec2c().revokeSecurityGroupIngress(
      {
        IpPermissions: stripEmptyArrayFields(IpPermissions),
        GroupId
      },
      err => {
        if (err) {
          reject(err);
        }
        resolve();
      }
    );
  });
};

export function* ensureSecurityGroupExists({
  VpcId,
  GroupName,
  name,
  Description
}: {
  VpcId: string;
  GroupName: string;
  name: string;
  Description: string;
}): Generator<unknown, EC2.SecurityGroup, EC2.SecurityGroup> {
  // Note(JP): towards making clear what name that is.
  const clusterName = name;

  const sgCreateParams = {
    Description,
    GroupName,
    VpcId
  };

  while (true) {
    const existingSecurityGroup: EC2.SecurityGroup = yield call(
      getSecurityGroup,
      {
        GroupName
      }
    );

    if (!existingSecurityGroup) {
      try {
        const securityGroup: EC2.SecurityGroup = yield call(
          createSecurityGroup,
          clusterName,
          sgCreateParams
        );
        if (!securityGroup) {
          throw Error(`SecurityGroup creation failed`);
        }
      } catch (e) {
        if (!e.code || (e.code && e.code !== 409)) {
          throw e;
        }
      }
    }
    if (existingSecurityGroup) {
      return existingSecurityGroup;
    }

    yield delay(1 * SECOND);
  }
}

export function* ensureSecurityGroupPermissionsDoNotExist({
  GroupName
}: {
  GroupName: string;
}): Generator<unknown, void, EC2.SecurityGroup> {
  log.info(
    "Ensuring Security Group Permissions do not exist for %s",
    GroupName
  );

  while (true) {
    const existingSecurityGroup: EC2.SecurityGroup = yield call(
      getSecurityGroup,
      {
        GroupName
      }
    );
    if (!existingSecurityGroup || !existingSecurityGroup.GroupId) {
      break;
    }

    const {
      IpPermissions,
      IpPermissionsEgress,
      GroupId
    } = existingSecurityGroup;

    if (
      (!IpPermissions || IpPermissions.length === 0) &&
      (!IpPermissionsEgress || IpPermissionsEgress.length === 0)
    ) {
      break;
    }
    try {
      if (IpPermissions && IpPermissions.length) {
        yield call(revokeSecurityGroupIngress, {
          GroupId,
          IpPermissions
        });
      }
      if (IpPermissionsEgress && IpPermissionsEgress.length) {
        yield call(revokeSecurityGroupEgress, {
          GroupId,
          IpPermissions: IpPermissionsEgress
        });
      }
    } catch (e) {
      if (!e.code || (e.code && e.code !== 404)) {
        throw e;
      }
    }

    yield delay(1 * SECOND);
  }
}

export function* ensureSecurityGroupDoesNotExist({
  GroupName
}: {
  GroupName: string;
}): Generator<unknown, void, EC2.SecurityGroup> {
  log.info("Delete security group: %s", GroupName);

  while (true) {
    const existingSecurityGroup: EC2.SecurityGroup = yield call(
      getSecurityGroup,
      {
        GroupName
      }
    );
    if (!existingSecurityGroup || !existingSecurityGroup.GroupId) {
      break;
    }

    yield delay(5 * SECOND);

    try {
      yield call(deleteSecurityGroup, existingSecurityGroup);
    } catch (e) {
      if (e instanceof AWSApiError) {
        // might get a 400 response with
        // DependencyViolation: resource sg-053d1422a4cdef521 has a dependent object
        // might also get a 400 response with `InvalidGroup.NotFound` (woof, why not a 404?)
        if (
          e.statusCode == 404 ||
          e.name == "DependencyViolation" ||
          e.name == "InvalidGroup.NotFound"
        ) {
          log.info("ignore: %s", e.name);
          continue;
        }
      }
      throw e;
    }
  }
}
