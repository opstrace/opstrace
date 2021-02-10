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

import { delay, call, CallEffect } from "redux-saga/effects";
import * as gcs from "@google-cloud/storage";

import { SECOND, log } from "@opstrace/utils";

const getBucket = async ({
  name,
  storage
}: {
  name: string;
  storage: gcs.Storage;
}): Promise<gcs.Bucket | undefined> => {
  return new Promise((resolve, reject) =>
    storage
      .getBuckets()
      .then(results => {
        const buckets = results[0];
        resolve(buckets.find(b => b.name === name));
      })
      .catch(err => {
        reject(err);
      })
  );
};

const createBucket = async ({
  name,
  location,
  storage
}: {
  name: string;
  location: string;
  storage: gcs.Storage;
}): Promise<gcs.CreateBucketResponse | null> => {
  return storage.createBucket(name, {
    location
  });
};

export const setBucketLifecycle = async ({
  name,
  days,
  storage
}: {
  name: string;
  days: number;
  storage: gcs.Storage;
}): Promise<gcs.CreateBucketResponse | null> =>
  new Promise((resolve, reject) => {
    const bucket = storage.bucket(name);
    //-
    // By default, the rule you provide will be added to the existing policy.
    // Optionally, you can disable this behavior to replace all of the
    // pre-existing rules by setting append: false.
    //-
    const options = {
      append: false
    };

    bucket.addLifecycleRule(
      {
        action: "delete",
        condition: {
          age: days
        }
      },
      options,
      function (err) {
        if (err) {
          reject(err);
        }
        resolve(null);
      }
    );
  });

export function* ensureBucketExists({
  bucketName,
  retentionDays,
  region
}: {
  bucketName: string;
  retentionDays: number;
  region: string;
}): Generator<CallEffect, unknown, unknown> {
  const storage = new gcs.Storage();

  log.info("create GCS bucket: %s", bucketName);
  while (true) {
    const bucket = yield call(getBucket, { name: bucketName, storage });
    if (bucket) {
      log.info("bucket returned by getBuckets(): %s", bucketName);
      return bucket;
    } else {
      log.info("bucket not returned by getBuckets()");
    }

    try {
      log.info("call createBucket()");
      yield call(createBucket, {
        name: bucketName,
        location: region,
        storage
      });
      yield call(setBucketLifecycle, {
        name: bucketName,
        days: retentionDays,
        storage
      });
    } catch (e) {
      if (!e.code || (e.code && e.code !== 409)) {
        throw e;
      }
    }

    yield delay(1 * SECOND);
  }
}

export function* emptyBucket({
  bucketName
}: {
  bucketName: string;
}): Generator<CallEffect, void, unknown> {
  const storage = new gcs.Storage();

  const bucket = yield call(getBucket, { name: bucketName, storage });
  if (!bucket) {
    return;
  }

  try {
    yield call(setBucketLifecycle, {
      name: bucketName,
      days: 0,
      storage
    });
  } catch (e) {
    if (!e.code || (e.code && e.code !== 409)) {
      throw e;
    }
  }
}
