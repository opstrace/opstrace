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

import { IAM } from "aws-sdk";

import { log } from "@opstrace/utils";

import { iamClient, awsPromErrFilter } from "./util";
import { AWSApiError } from "./types";
import { AWSResource } from "./resource";

class InstanceProfileRes extends AWSResource<IAM.InstanceProfile> {
  protected rname = "instance profile";

  private ipname: string;

  constructor(opstraceClusterName: string) {
    super(opstraceClusterName);

    // source of truth for generating IP name based on OCN.
    this.ipname = `${opstraceClusterName}-instance-profile`;
  }

  // todo: there's probably a more elegant way to build a "getter"
  public getIpName(): string {
    return this.ipname;
  }

  /**
   * Return `false`: upon receiving an unambiguous HTTP API response
   * indicating that IP does not exist (404 / NoSuchEntity).
   */
  private async lookup(): Promise<IAM.InstanceProfile | false> {
    try {
      const result: IAM.GetInstanceProfileResponse = await awsPromErrFilter(
        iamClient()
          .getInstanceProfile({ InstanceProfileName: this.ipname })
          .promise()
      );
      // be conservative: opstrace-prelaunch/issues/1480
      if (result && result.InstanceProfile) {
        return result.InstanceProfile;
      }
      throw new Error(
        `unexpected result obj: ${JSON.stringify(result, null, 2)}`
      );
    } catch (e) {
      if (e instanceof AWSApiError) {
        // well-defined, explicit confirmation that IP does not exist.
        if (e.name == "NoSuchEntity") {
          return false;
        }
      }
      throw e;
    }
  }

  protected async tryCreate() {
    const result: IAM.CreateInstanceProfileResponse = await awsPromErrFilter(
      iamClient()
        .createInstanceProfile({ InstanceProfileName: this.ipname })
        .promise()
    );
    if (result && result.InstanceProfile) {
      return true;
    }
    throw new Error(
      `IP creation error? Result object: ${JSON.stringify(result, null, 2)}`
    );
  }

  protected async checkCreateSuccess(): Promise<IAM.InstanceProfile | false> {
    return await this.lookup();
  }

  protected async tryDestroy() {
    await awsPromErrFilter(
      iamClient()
        .deleteInstanceProfile({ InstanceProfileName: this.ipname })
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
}

/**
 * Return InstanceProfileName
 */
export async function createInstanceProfile(
  opstraceClusterName: string
): Promise<string> {
  const ipres = new InstanceProfileRes(opstraceClusterName);
  await ipres.setup();
  return ipres.getIpName();
}

export async function destroyInstanceProfile(opstraceClusterName: string) {
  await new InstanceProfileRes(opstraceClusterName).teardown();
}

export const addRole = ({
  RoleName,
  InstanceProfileName
}: {
  RoleName: string;
  InstanceProfileName: string;
}) => {
  return new Promise((resolve, reject) => {
    iamClient().addRoleToInstanceProfile(
      { RoleName, InstanceProfileName },
      err => {
        if (err) {
          if (err.code === "LimitExceeded") {
            // InstanceProfile has a limit of 1 attached role. We can assume the
            // attached role is already ours.
            resolve();
          }
          reject(err);
        }
        resolve();
      }
    );
  });
};

export const removeRole = ({
  RoleName,
  InstanceProfileName
}: {
  RoleName: string;
  InstanceProfileName: string;
}) => {
  log.info(
    `Ensuring InstanceProfile ${InstanceProfileName} has ${RoleName} role removed`
  );
  return new Promise((resolve, reject) => {
    iamClient().removeRoleFromInstanceProfile(
      { RoleName, InstanceProfileName },
      err => {
        if (err) {
          if (err.statusCode === 404) {
            resolve();
          } else {
            reject(err);
          }
        }
        resolve();
      }
    );
  });
};
