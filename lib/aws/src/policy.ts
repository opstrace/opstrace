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

import { IAM } from "aws-sdk";
import { delay, call } from "redux-saga/effects";

import { SECOND } from "@opstrace/utils";

import { iamClient } from "./util";

export const getPolicy = async ({
  PolicyName
}: {
  PolicyName: string;
}): Promise<IAM.Policy | undefined> => {
  return new Promise((resolve, reject) => {
    iamClient().listPolicies({}, (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(
        data.Policies && data.Policies.find(r => r.PolicyName === PolicyName)
      );
    });
  });
};

export const createPolicy = ({
  PolicyName,
  PolicyDocument
}: {
  PolicyName: string;
  PolicyDocument: string;
}): Promise<IAM.Policy | undefined> => {
  return new Promise((resolve, reject) => {
    iamClient().createPolicy({ PolicyName, PolicyDocument }, (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(data && data.Policy);
    });
  });
};

export const deletePolicy = ({
  PolicyArn
}: {
  PolicyArn: string;
}): Promise<void> => {
  return new Promise((resolve, reject) => {
    iamClient().deletePolicy({ PolicyArn }, err => {
      if (err) {
        reject(err);
      }
      resolve();
    });
  });
};

export function* ensurePolicyExists({
  PolicyName,
  PolicyDocument
}: {
  PolicyName: string;
  PolicyDocument: string;
}): Generator<unknown, IAM.Policy, IAM.Policy> {
  while (true) {
    const existingPolicy: IAM.Policy = yield call(getPolicy, {
      PolicyName
    });
    if (!existingPolicy) {
      try {
        const policy: IAM.Policy | undefined = yield call(createPolicy, {
          PolicyDocument,
          PolicyName
        });

        if (!policy) {
          throw Error(`Policy creation failed`);
        }
      } catch (e) {
        if (!e.code || (e.code && e.code !== 409)) {
          throw e;
        }
      }
    }
    if (existingPolicy) {
      return existingPolicy;
    }

    yield delay(1 * SECOND);
  }
}

export function* ensurePolicyDoesNotExist({
  PolicyName
}: {
  PolicyName: string;
}): Generator<unknown, void, IAM.Policy> {
  while (true) {
    const existingPolicy: IAM.Policy = yield call(getPolicy, {
      PolicyName
    });
    if (!existingPolicy || !existingPolicy.Arn) {
      break;
    }
    try {
      yield call(deletePolicy, {
        PolicyArn: existingPolicy.Arn
      });
    } catch (e) {
      if (!e.code || (e.code && e.code !== 404)) {
        throw e;
      }
    }

    yield delay(1 * SECOND);
  }
}
