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
  // the array of lifecycle rules to apply to this bucket, we don't handle the
  // deletion since that is taken cared of for us when the bucket is deleted
  private lifecycleRules: AWS.S3.LifecycleRules = [];
  // overridden in constructor, see below.
  protected rname = "";

  constructor(
    opstraceClusterName: string,
    bucketName: string,
    retentionPeriod: number = 0,
    tenants: string[] = []
  ) {
    super(opstraceClusterName);

    this.changeRname(`s3 bucket ${bucketName}`);

    // implement a little bit of a convention here
    assert.equal(bucketName.startsWith(opstraceClusterName), true);

    this.bname = bucketName;

    // Don't forget the system tenant
    const tnames = [...tenants];
    tnames.push("system");

    //
    // For each tenant create a lifecycle rule that deletes data when retention
    // period is reached. The retention period follows the following rules (from
    // https://aws.amazon.com/premiumsupport/knowledge-center/s3-lifecycle-rule-delay/):
    //
    // "Amazon S3 rounds the transition or expiration date of an object to
    // midnight UTC the next day. For example, if you created an object on
    // 1/1/2020 10:30 UTC, and you set the lifecycle rule to transition the
    // object after 3 days, then the transition date of the object is 1/5/2020
    // 00:00 UTC. Before you check whether a lifecycle rule has been satisfied,
    // be sure to verify that enough time has elapsed."
    //
    for (const tname of tnames) {
      this.lifecycleRules.push({
        ID: `${tname}-tenant-retention-period`,
        Status: "Enabled",
        AbortIncompleteMultipartUpload: {
          DaysAfterInitiation: retentionPeriod
        },
        Expiration: {
          Days: retentionPeriod
        },
        //
        // https://docs.aws.amazon.com/AmazonS3/latest/dev/intro-lifecycle-rules.html#non-current-days-calculations
        //
        // "In a versioning-enabled bucket, you can have multiple versions of an
        // object, there is always one current version, and zero or more
        // noncurrent versions. Each time you upload an object, the current
        // version is retained as the noncurrent version and the newly added
        // version, the successor, becomes the current version."
        //
        // No harm in setting it so we ensure it's always deleted correctly.
        //
        NoncurrentVersionExpiration: {
          NoncurrentDays: retentionPeriod
        },
        Filter: {
          Prefix: `${tname}/`
        }
      });
    }
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

  private async lifecycleRulesAreApplied(): Promise<boolean> {
    try {
      const resp = await awsPromErrFilter(
        s3Client()
          .getBucketLifecycleConfiguration({
            Bucket: this.bname
          })
          .promise()
      );

      if (resp.Rules === undefined) {
        return false;
      }

      const ids: string[] = [];
      for (const r of resp.Rules as AWS.S3.LifecycleRules) {
        if (r.ID !== undefined) {
          ids.push(r.ID);
        }
      }
      // Check if the bucket rules contains all the necessary rule ids.
      return this.lifecycleRules.every(r => ids.includes(r.ID!));
    } catch (e) {
      if (e instanceof AWSApiError) {
        if (e.statusCode == 404 || e.statusCode == 403) {
          log.debug(
            "getBucketLifecycleConfiguration resp, treat as 'does not exist': %s",
            e.message
          );
          return false;
        }
      }
      throw e;
    }
  }

  async tryCreate(): Promise<true> {
    try {
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
    } catch (e) {
      // fail on any error except if it's 409 BucketAlreadyOwnedByYou error
      if (!(e instanceof AWSApiError) || e.statusCode != 409) {
        throw e;
      }
    } finally {
      // Apply lifecycle configuration rules to the bucket.
      await awsPromErrFilter(
        s3Client()
          .putBucketLifecycleConfiguration({
            Bucket: this.bname,
            LifecycleConfiguration: {
              Rules: this.lifecycleRules
            }
          })
          .promise()
      );
    }

    return true;
  }

  async checkCreateSuccess(): Promise<boolean> {
    return (await this.lookup()) && (await this.lifecycleRulesAreApplied());
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
