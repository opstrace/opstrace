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

import AWS from "aws-sdk";

import { log } from "@opstrace/utils";

import { AWSApiError } from "./types";

// supposed to be a tidy immutable singleton in the future: write/set once,
// read/consume from anywhere w/o the need to explicitly pass this through
// function arguments.
let awsRegion: string | undefined;

export function setAWSRegion(r: string) {
  if (awsRegion !== undefined) {
    throw new Error("setAWSRegion() was already called before");
  }
  awsRegion = r;
}

function getAWSRegion() {
  if (awsRegion === undefined) {
    throw new Error("call setAWSRegion() first");
  }
  return awsRegion;
}

// Adjust global (singleton) AWS client config
// `AWS.config` *is* "the global configuration object singleton instance", see
// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS.html#config-property

AWS.config.update({
  httpOptions: {
    // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#httpOptions-property
    // milliseconds
    connectTimeout: 4000,
    // Documented with "milliseconds of inactivity on the socket". That is,
    // this cannot be used to define a guaranteed upper limit for the duration
    // of an HTTP request/response cycle (that's good, though, just important)
    // to be aware of.
    timeout: 30000
  },
  // maxRetries, to be sure, should be set per service, seemingly.
  retryDelayOptions: {
    customBackoff: function (retryCount: number, err: Error | undefined) {
      // Return the amount of time to delay, in milliseconds. Custom
      // implementation, primary reason: use this to log transient errors.
      // Secondary reason: use a really simple retry strategy for starters.
      // Assume that HTTP requests are fired off in the context of micro tasks
      // which retry "forever" anyway.
      if (!err) {
        log.debug(
          "aws-sdk-js request failed (attempt %s): no err information",
          retryCount
        );
      } else {
        // An example `err.message` for the frequent real-world scenario of a
        // TCP connect() timeout is "Socket timed out without establishing a
        // connection". Info-log that so that the reason for delays is not
        // hidden from users.
        log.debug(
          "aws-sdk-js request failed (attempt %s): %s: %s (retryable, according to sdk: %s)",
          retryCount,
          err.name,
          err.message,
          //@ts-ignore: we want to log that also if undefined
          err.retryable
        );
      }
      if (retryCount < 2) {
        return 1000;
      }
      return 3000;
    }
  }
});

// https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/logging-sdk-calls.html
// `AWS.config.logger` needs to be set to an object providing the `log` method.
// Do so, direct it to our winston log system.
const awsLoggerBridge = {
  log: (msg: string) => {
    log.debug("aws sdk: %s", msg);
  }
};
AWS.config.logger = awsLoggerBridge;

/**
 * AWS client objects representing current config (plan: make use of singleton
 * config object representing user-given config)
 */
export function autoScalingClient(): AWS.AutoScaling {
  return new AWS.AutoScaling({
    region: getAWSRegion(),
    maxRetries: 10
  });
}

export function ec2c(): AWS.EC2 {
  return new AWS.EC2({
    region: getAWSRegion(),
    maxRetries: 10
  });
}

export function iamClient(): AWS.IAM {
  return new AWS.IAM({
    region: getAWSRegion(),
    maxRetries: 10
  });
}

export function eksClient(regionOverride?: string): AWS.EKS {
  let r: string;
  if (regionOverride !== undefined) {
    r = regionOverride;
  } else {
    r = getAWSRegion();
  }
  return new AWS.EKS({
    region: r,
    maxRetries: 15
  });
}

export function rdsClient(): AWS.RDS {
  return new AWS.RDS({
    region: getAWSRegion(),
    maxRetries: 10
  });
}

export function r53Client(): AWS.Route53 {
  return new AWS.Route53({
    region: getAWSRegion(),
    maxRetries: 10
  });
}

export function s3Client(): AWS.S3 {
  return new AWS.S3({
    region: getAWSRegion(),
    maxRetries: 10
  });
}

export function elbClient(): AWS.ELBv2 {
  return new AWS.ELBv2({
    region: getAWSRegion(),
    maxRetries: 10
  });
}

export function stsClient(): AWS.STS {
  return new AWS.STS({
    region: getAWSRegion(),
    // "stsRegionalEndpoints ('legacy'|'regional') — whether to send sts request
    // to global endpoints or regional endpoints. Defaults to 'legacy'."
    // also see issue opstrace-prelaunch/issues/2001
    stsRegionalEndpoints: "regional",
    maxRetries: 10
  });
}

/**
 * Wait for promise to resolve.
 *
 * If promise is rejected then inspect the error and translate it into
 * an object of type AWSApiError if applicable -- which can then cleanly
 * be detected and handled in consumers.
 *
 * @param prom
 */
export async function awsPromErrFilter(prom: Promise<any>) {
  try {
    return await prom;
  } catch (e) {
    throwIfAWSAPIError(e);
    throw e;
  }
}

/**
 *
 * Try to detect an AWS HTTP API error, and translate it into a
 * TS-friendly error representing such.
 *
 * Also see https://github.com/aws/aws-sdk-js/issues/2611
 */
export function throwIfAWSAPIError(err: Error) {
  //log.debug("err detail: %s", JSON.stringify(err, null, 2));
  //@ts-ignore: property originalError does not exist on type Error.
  const awserr = err.originalError;
  //@ts-ignore: property statusCode does not exist on type Error.
  const httpsc = err.statusCode;
  if (awserr === undefined && httpsc === undefined) {
    log.debug("this does not appear to be an AWS API error");
    return;
  }

  // Try to log as much original error detail as possible.
  if (awserr !== undefined) {
    log.debug("err.originalError: %s", JSON.stringify(awserr, null, 2));
  }

  // I tested this out: code corresponds to name and is the AWS error 'type',
  // for example `DependencyViolation`. `statusCode` should be set for all
  // errors communicated in an HTTP error response.
  let msg = `${err.name}: ${err.message}`;

  if (httpsc !== undefined) {
    msg = `${msg} (HTTP status code: ${httpsc})`;
  }

  throw new AWSApiError(msg, err.name, httpsc);
}

export function getWaitTimeSeconds(cycle: number) {
  // various callers rely on 0 wait time in cycle 1 (1 corresponds to the first
  // cycle).
  if (cycle == 1) {
    return 0;
  }
  // Note(JP): more sophisticated strategy later.
  return 10;
}

export const getTagFilter = (clusterName: string) => ({
  Name: `tag:opstrace_cluster_name`,
  Values: [clusterName]
});

export const getTags = (clusterName: string): AWS.EC2.Tag[] => [
  {
    Key: `opstrace_cluster_name`,
    Value: clusterName
  },
  {
    Key: `kubernetes.io/cluster/${clusterName}`,
    Value: "shared"
  }
];

export const tagResource = ({
  clusterName,
  resourceId,
  tags
}: {
  clusterName: string;
  resourceId: string;
  tags?: AWS.EC2.Tag[];
}): Promise<any> => {
  return new Promise((resolve, reject) => {
    const additionalTags = tags ? tags : [];
    ec2c().createTags(
      {
        Tags: [...getTags(clusterName), ...additionalTags],
        Resources: [resourceId]
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

export const untagResource = ({
  name,
  resourceId
}: {
  name: string;
  resourceId: string;
}): Promise<any> => {
  return new Promise((resolve, reject) => {
    ec2c().deleteTags(
      {
        Tags: getTags(name),
        Resources: [resourceId]
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

export const getAccountId = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const sts = new AWS.STS();
    sts.getCallerIdentity({}, (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(data.Account);
    });
  });
};

export function generateKubeconfigStringForEksCluster(
  region: string,
  cluster: AWS.EKS.Cluster
) {
  return `apiVersion: v1
preferences: {}
kind: Config

clusters:
- cluster:
    server: ${cluster.endpoint}
    certificate-authority-data: ${cluster.certificateAuthority!.data}
  name: ${cluster.name}

contexts:
- context:
    cluster: ${cluster.name}
    user: ${cluster.name}
  name: ${cluster.name}

current-context: ${cluster.name}

users:
- name: ${cluster.name}
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1alpha1
      command: aws
      args:
      - --region
      - ${region}
      - eks
      - get-token
      - --cluster-name
      - ${cluster.name}
`;
}
