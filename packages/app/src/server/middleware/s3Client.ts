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
import { Request, Response, NextFunction } from "express";
import Minio from "minio";
import { log } from "@opstrace/utils/lib/log";

import env, { isDevEnvironment } from "../env";

let bucketExists: boolean;

async function createS3Client(): Promise<[Minio.Client | null, Error | null]> {
  try {
    let client: Minio.Client;

    if (isDevEnvironment) {
      client = new Minio.Client({
        endPoint: env.S3_ENDPOINT,
        port: 9000,
        accessKey: "AKIAIOSFODNN7EXAMPLE",
        secretKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
      });
    } else {
      client = new Minio.Client({
        endPoint: env.S3_ENDPOINT,
        accessKey: "",
        secretKey: ""
      });
    }
    if (bucketExists) {
      return [client, null];
    }
    // Ensure our bucket exists. This is especially useful for local development
    // but also a nice step to ensure the bucket exists in prod before trying to access it.
    const exists = await client.bucketExists(env.S3_BUCKET_NAME);
    if (exists) {
      bucketExists = true;
      return [client, null];
    }
    await client.makeBucket(env.S3_BUCKET_NAME, env.S3_BUCKET_REGION);
    bucketExists = true;

    return [client, null];
  } catch (e) {
    return [null, e];
  }
}

interface S3Object {
  path: string;
  contents: string;
}

async function putObject(client: Minio.Client, obj: S3Object): Promise<string> {
  // TODO: add retry and error handling for case of object already exists
  return new Promise((resolve, reject) => {
    client.putObject(env.S3_BUCKET_NAME, obj.path, obj.contents, function(
      err,
      etag
    ) {
      if (err) {
        reject(err);
        return;
      }
      resolve(etag);
    });
  });
}

export function putObjects(client: Minio.Client, objects: S3Object[]) {
  return Promise.all(objects.map(o => putObject(client, o)));
}

export default async function s3ClientMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const [client, error] = await createS3Client();
  if (error || !client) {
    log.error("failed to create s3 client and ensure bucket exists: %s", error);
    throw new Error("could not connect to s3");
  }
  req.s3Client = client;
  next();
}
