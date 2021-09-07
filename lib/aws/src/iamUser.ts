/**
 * Copyright 2021 Opstrace, Inc.
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

const listUsers = ({
  params
}: {
  params: IAM.ListUsersRequest;
}): Promise<IAM.ListUsersResponse | undefined> => {
  return new Promise((resolve, reject) => {
    iamClient().listUsers(params, (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
};

// getUser queries for the list of IAM users and returns the one that matches
// the given UserName. Returns undefined if a match is not found. Handles
// paginated results using the Marker as described in
// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/IAM.html#listUsers-property
export function* getUser({
  UserName
}: {
  UserName: string;
}): Generator<unknown, IAM.User | undefined, IAM.ListUsersResponse> {
  let truncated: boolean | undefined = true;
  const params: IAM.ListUsersRequest = {};

  while (truncated) {
    const data: IAM.ListUsersResponse | undefined = yield call(listUsers, {
      params
    });

    truncated = data?.IsTruncated;
    params.Marker = data?.Marker;

    const p = data?.Users?.find(r => r.UserName === UserName);
    if (p !== undefined) {
      return p;
    }
  }

  return undefined;
}

const createUser = ({
  user
}: {
  user: IAM.CreateUserRequest;
}): Promise<IAM.User | undefined> => {
  return new Promise((resolve, reject) => {
    iamClient().createUser(user, (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(data && data.User);
    });
  });
};

async function deleteUser(UserName: string) {
  return await awsPromErrFilter(iamClient().deleteUser({ UserName }).promise());
}

export const attachUserPolicy = ({
  UserName,
  PolicyArn
}: {
  UserName: string;
  PolicyArn: string;
}): Promise<void> => {
  return new Promise((resolve, reject) => {
    iamClient().attachUserPolicy({ UserName, PolicyArn }, err => {
      if (err) {
        reject(err);
      }
      resolve();
    });
  });
};

export const detachUserPolicy = ({
  UserName,
  PolicyArn
}: {
  UserName: string;
  PolicyArn: string;
}): Promise<void> => {
  return new Promise((resolve, reject) => {
    iamClient().detachUserPolicy({ UserName, PolicyArn }, err => {
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

export function* ensureUserExists({
  UserName,
  Tags
}: {
  UserName: string;
  Tags: IAM.Tag[];
}): Generator<unknown, IAM.User, IAM.User> {
  while (true) {
    const existingUser: IAM.User | undefined = yield call(getUser, {
      UserName
    });

    if (!existingUser) {
      try {
        const user: IAM.User | undefined = yield call(createUser, {
          user: {
            UserName,
            Tags
          }
        });
        if (!user) {
          throw Error(`User creation failed`);
        }
      } catch (e: any) {
        if (!e.code || (e.code && e.code !== 409)) {
          throw e;
        }
      }
    }
    if (existingUser) {
      return existingUser;
    }

    yield delay(1 * SECOND);
  }
}

export function* ensureUserDoesNotExist({
  UserName
}: {
  UserName: string;
}): Generator<unknown, void, IAM.User> {
  log.info(`Ensuring IAM user ${UserName} does not exist`);

  while (true) {
    const existingUser: IAM.User | undefined = yield call(getUser, {
      UserName
    });

    if (!existingUser) {
      break;
    }

    yield delay(5 * SECOND);

    try {
      yield call(deleteUser, UserName);
    } catch (e: any) {
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
