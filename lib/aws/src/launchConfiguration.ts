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

import { AutoScaling, EKS } from "aws-sdk";
import { delay, call } from "redux-saga/effects";

import { SECOND, log } from "@opstrace/utils";

import {
  autoScalingClient,
  awsPromErrFilter,
  getWaitTimeSeconds
} from "./util";

import { AWSApiError } from "./types";

const getLaunchConfiguration = async ({
  LaunchConfigurationName
}: {
  LaunchConfigurationName: string;
}): Promise<AutoScaling.LaunchConfiguration | undefined> => {
  return new Promise((resolve, reject) => {
    autoScalingClient().describeLaunchConfigurations(
      { LaunchConfigurationNames: [LaunchConfigurationName] },
      (err, data) => {
        if (err) {
          reject(err);
        }
        resolve(
          data.LaunchConfigurations.length
            ? data.LaunchConfigurations[0]
            : undefined
        );
      }
    );
  });
};

/**
 * Create LC and return promise to `...` or throw  an error.
 */
async function createLaunchConfiguration(
  launchConfigParams: AutoScaling.CreateLaunchConfigurationType
): Promise<unknown> {
  // result not well-typed in library,
  const result: unknown = await awsPromErrFilter(
    autoScalingClient().createLaunchConfiguration(launchConfigParams).promise()
  );
  if (result) {
    return result;
  }
  // when we see this happening in real world: double-check how this happens,
  // then maybe throw an AWSAPIError
  throw new Error(
    `launch config creation error? Result object: ${JSON.stringify(
      result,
      null,
      2
    )}`
  );
}

async function deleteLaunchConfiguration(LaunchConfigurationName: string) {
  await awsPromErrFilter(
    autoScalingClient()
      .deleteLaunchConfiguration({ LaunchConfigurationName })
      .promise()
  );
}

export function* ensureLaunchConfigurationExists({
  LaunchConfigurationName,
  IamInstanceProfile,
  securityGroupId,
  cluster,
  name,
  imageId,
  instanceType,
  keyName
}: {
  LaunchConfigurationName: string;
  IamInstanceProfile: string;
  securityGroupId: string;
  cluster: EKS.Cluster;
  name: string;
  imageId: string;
  instanceType: string;
  keyName?: string;
}): Generator<
  unknown,
  AutoScaling.LaunchConfiguration,
  AutoScaling.LaunchConfiguration | undefined
> {
  log.info(`Ensuring LaunchConfiguration ${LaunchConfigurationName} exists`);
  // Note(JP): assume cluster is ready, and then make it so that this
  // assumption is fulfilled.
  const { certificateAuthority, endpoint } = cluster;
  if (!certificateAuthority || !endpoint) {
    throw Error(`EKS cluster is not ready`);
  }

  const UserData = Buffer.from(
    `
#!/bin/bash
set -o xtrace
/etc/eks/bootstrap.sh --apiserver-endpoint ${endpoint} --b64-cluster-ca ${certificateAuthority.data} ${name}
`
  ).toString("base64");

  const launchConfigParams: AutoScaling.CreateLaunchConfigurationType = {
    LaunchConfigurationName,
    IamInstanceProfile,
    KeyName: keyName,
    SecurityGroups: [securityGroupId],
    ImageId: imageId,
    InstanceType: instanceType,
    UserData
  };

  let cycle = 1;
  while (true) {
    log.debug("launch config setup: cycle %s", cycle);

    const lc: AutoScaling.LaunchConfiguration | undefined = yield call(
      getLaunchConfiguration,
      {
        LaunchConfigurationName
      }
    );
    if (lc) {
      log.info("launch config setup: reached desired state, done");
      return lc;
    }
    yield delay(getWaitTimeSeconds(cycle) * SECOND);

    try {
      yield call(createLaunchConfiguration, launchConfigParams);
    } catch (e) {
      if (!(e instanceof AWSApiError)) {
        throw e;
      }
      log.info("launch config setup: API response: %s", e.message);
    }

    cycle++;
  }
}

export function* ensureLaunchConfigurationDoesNotExist({
  LaunchConfigurationName
}: {
  LaunchConfigurationName: string;
}): Generator<unknown, void, AutoScaling.LaunchConfiguration> {
  log.info(
    `Ensuring LaunchConfiguration ${LaunchConfigurationName} does not exist`
  );
  while (true) {
    const existingLaunchConfiguration: AutoScaling.LaunchConfiguration = yield call(
      getLaunchConfiguration,
      {
        LaunchConfigurationName
      }
    );

    if (!existingLaunchConfiguration) {
      break;
    }

    yield delay(5 * SECOND);

    try {
      yield call(deleteLaunchConfiguration, LaunchConfigurationName);
    } catch (e) {
      if (e instanceof AWSApiError) {
        // seen in the wild: `AWSApiError [ValidationError]: ValidationError:
        // Launch configuration name not found - Launch configuration
        // bk-1969-65d-a-primary-launch-configuration not found (HTTP status
        // code: 400)`
        if (
          e.statusCode == 404 ||
          e.name == "ResourceInUse" ||
          e.name == "ValidationError"
        ) {
          log.info("ignore: %s", e.name);
          continue;
        }
      }
      throw e;
    }
  }
}
