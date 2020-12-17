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
import { delay, call } from "redux-saga/effects";

import { SECOND, log } from "@opstrace/utils";

import { awsPromErrFilter, iamClient } from "./util";
import { AWSApiError } from "./types";

const getRole = async ({
  RoleName
}: {
  RoleName: string;
}): Promise<IAM.Role | undefined> => {
  return new Promise((resolve, reject) => {
    iamClient().listRoles({}, (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(data.Roles.find(r => r.RoleName === RoleName));
    });
  });
};

const createRole = ({
  role
}: {
  role: IAM.CreateRoleRequest;
}): Promise<IAM.Role | undefined> => {
  return new Promise((resolve, reject) => {
    iamClient().createRole(role, (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(data && data.Role);
    });
  });
};

async function deleteRole(RoleName: string) {
  return await awsPromErrFilter(iamClient().deleteRole({ RoleName }).promise());
}

export const attachPolicy = ({
  RoleName,
  PolicyArn
}: {
  RoleName: string;
  PolicyArn: string;
}): Promise<void> => {
  return new Promise((resolve, reject) => {
    iamClient().attachRolePolicy({ RoleName, PolicyArn }, err => {
      if (err) {
        reject(err);
      }
      resolve();
    });
  });
};

export const detachPolicy = ({
  RoleName,
  PolicyArn
}: {
  RoleName: string;
  PolicyArn: string;
}): Promise<void> => {
  return new Promise((resolve, reject) => {
    iamClient().detachRolePolicy({ RoleName, PolicyArn }, err => {
      if (err) {
        if (err.statusCode === 404) {
          resolve();
        } else {
          reject(err);
        }
      }
      resolve();
    });
  });
};

export function* ensureRoleExists({
  RoleName,
  AssumeRolePolicyDocument
}: {
  RoleName: string;
  AssumeRolePolicyDocument: string;
}): Generator<unknown, IAM.Role, IAM.Role> {
  while (true) {
    const existingRole: IAM.Role = yield call(getRole, {
      RoleName
    });

    if (!existingRole) {
      try {
        const role: IAM.Role | undefined = yield call(createRole, {
          role: {
            AssumeRolePolicyDocument,
            RoleName
          }
        });
        if (!role) {
          throw Error(`Role creation failed`);
        }
      } catch (e) {
        if (!e.code || (e.code && e.code !== 409)) {
          throw e;
        }
      }
    }
    if (existingRole) {
      return existingRole;
    }

    yield delay(1 * SECOND);
  }
}

export function* ensureRoleDoesNotExist({
  RoleName
}: {
  RoleName: string;
}): Generator<unknown, void, IAM.Role> {
  log.info(`Ensuring IAM role ${RoleName} does not exist`);

  while (true) {
    const existingRole: IAM.Role = yield call(getRole, {
      RoleName
    });

    if (!existingRole) {
      break;
    }

    yield delay(5 * SECOND);

    try {
      yield call(deleteRole, RoleName);
    } catch (e) {
      if (e instanceof AWSApiError) {
        // 409 corresponds to 'DeleteConflict: Cannot delete entity, must
        // detach all policies first.'
        if (e.statusCode == 404 || e.name == "DeleteConflict") {
          log.info("ignore: %s", e.name);
          continue;
        }
      }
      throw e;
    }
  }
}
