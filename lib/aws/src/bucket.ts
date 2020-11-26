// Copyright 2020 Opstrace, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { strict as assert } from "assert";

import * as AWS from "aws-sdk";

import { log } from "@opstrace/utils";

import { awsPromErrFilter, s3Client } from "./util";
import { AWSApiError } from "./types";
import { AWSResource } from "./resource";

export class S3BucketRes extends AWSResource<true> {
  private bname: string;

  // overridden in constructor, see below.
  protected rname = "";

  constructor(opstraceClusterName: string, bucketName: string) {
    super(opstraceClusterName);

    this.changeRname(`s3 bucket ${bucketName}`);

    // implement a little bit of a convention here
    assert.equal(bucketName.startsWith(opstraceClusterName), true);

    this.bname = bucketName;
  }

  private async lookup(): Promise<boolean> {
    try {
      await awsPromErrFilter(
        s3Client()
          .headBucket({
            Bucket: this.bname
          })
          .promise()
      );
      return true;
    } catch (e) {
      if (e instanceof AWSApiError) {
        if (e.statusCode == 404 || e.statusCode == 403) {
          log.debug(
            "headBucket resp, treat as 'does not exist': %s",
            e.message
          );
          return false;
        }
      }
      throw e;
    }
  }

  async tryCreate(): Promise<true> {
    // Rely on the client lib to throw an Error in all(!) cases where the
    // bucket was not created. Still not 100 % sure if aws-sdk-jk is doing
    // that or not, but let's see.

    await awsPromErrFilter(
      s3Client()
        .createBucket({
          Bucket: this.bname,
          CreateBucketConfiguration: {
            // "Specifies the Region where the bucket will be created. If you
            // don't specify a Region, the bucket is created in the US East (N.
            // Virginia) Region (us-east-1)."
            LocationConstraint: s3Client().config.region!
          }
        })
        .promise()
    );

    // Note(JP): in the legacy approach we applied a lifecycle config right
    // away. Don't do this, revisit later. See
    // opstrace-prelaunch/issues/1469

    return true;
  }

  async checkCreateSuccess(): Promise<boolean> {
    if (await this.lookup()) {
      return true;
    }
    return false;
  }

  // for now, perform only the first step of 2-step-bucket-deletion procedure.
  async tryDestroy(): Promise<void> {
    await deleteBucketContentsViaLifecycle(this.bname);
  }

  async checkDestroySuccess(): Promise<true | string> {
    // handle case where bucket is already gone (where the second step of the
    // two-step destruction procedure has been performed by some entity.)
    if (!(await this.lookup())) {
      return true;
    }

    // Chek if the `opstrace-uninstall-auto-delete-after-one-day` lifecycle
    // config has been set (name-based convention).
    const result: AWS.S3.BucketLifecycleConfiguration = await awsPromErrFilter(
      s3Client()
        .getBucketLifecycleConfiguration({
          Bucket: this.bname
        })
        .promise()
    );

    for (const rule of result.Rules) {
      if (rule.ID === "opstrace-uninstall-auto-delete-after-one-day")
        return true;
    }

    // string representing state
    return JSON.stringify(result, null, 2);
  }
}

// also see opstrace-prelaunch/issues/1324
async function deleteBucketContentsViaLifecycle(bucketName: string) {
  const request = {
    Bucket: bucketName,
    LifecycleConfiguration: {
      Rules: [
        {
          ID: "opstrace-uninstall-auto-delete-after-one-day",
          Status: "Enabled",
          AbortIncompleteMultipartUpload: {
            DaysAfterInitiation: 1
          },
          Expiration: {
            Days: 1 // must be a positive integer (0 won't work, but a specific datetime could be provided alternatively)
          },
          NoncurrentVersionExpiration: {
            NoncurrentDays: 1
          },
          Filter: {
            // "If you want the Lifecycle rule to apply to all objects in the bucket, specify an empty prefix."
            Prefix: ""
          }
        }
      ]
    }
  };

  log.info(
    "s3 bucket %s: set lifecycle config to delete contents after 1 day",
    bucketName
  );

  await awsPromErrFilter(
    s3Client().putBucketLifecycleConfiguration(request).promise()
  );
}
