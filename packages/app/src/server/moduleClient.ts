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
import * as Minio from "minio";
import { promisify } from "util";
import redis from "redis";
import formatISO from "date-fns/formatISO";
import { v4 as uuidv4 } from "uuid";
import env, { isDevEnvironment } from "./env";
import graphqlClient from "state/clients/graphqlClient";
import { Files, File, TextOperations } from "state/file/types";
import { log } from "@opstrace/utils";
import { getFileUri } from "state/file/utils/uri";
import { applyOps } from "state/file/utils/ops";
import { sleep } from "state/utils/time";
import semver from "semver";

export async function ensureStorageBucketExists() {
  try {
    const client = createS3Client();
    // Ensure bucket exists in minio
    const exists = await client.bucketExists(env.S3_BUCKET_NAME);
    if (exists) {
      return;
    }
    await client.makeBucket(env.S3_BUCKET_NAME, env.S3_BUCKET_REGION);
  } catch (err) {
    log.error(err);
  }
}

function createS3Client(): Minio.Client {
  if (isDevEnvironment) {
    return new Minio.Client({
      endPoint: env.S3_ENDPOINT,
      port: 9000,
      useSSL: false,
      accessKey: "AKIAIOSFODNN7EXAMPLE",
      secretKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
    });
  }
  return new Minio.Client({
    endPoint: env.S3_ENDPOINT,
    accessKey: "",
    secretKey: ""
  });
}

function createRedisClient(): redis.RedisClient {
  return redis.createClient({
    host: env.REDIS_HOST,
    password: env.REDIS_PASSWORD
  });
}

type RedisQueueItem = { key: string; values: string[] };

class ModuleClient {
  s3: Minio.Client;
  graphql = graphqlClient;
  redis = createRedisClient();
  redisGet: (arg1: string) => Promise<string | null>;
  redisSet: (arg1: string, arg2: string) => Promise<unknown>;
  redisLRange: (arg1: string, arg2: number, arg3: number) => Promise<string[]>;
  redisDel: (arg1: string) => Promise<number>;
  private redisPushQueue: RedisQueueItem[] = [];
  private lockFileOps = false;

  private initialfileVersion = "0.0.1";
  private bucket = env.S3_BUCKET_NAME;
  constructor() {
    this.s3 = createS3Client();
    this.redisGet = promisify(this.redis.get).bind(this.redis);
    this.redisSet = promisify(this.redis.set).bind(this.redis);
    this.redisLRange = promisify(this.redis.lrange).bind(this.redis);
    this.redisDel = promisify(this.redis.del).bind(this.redis);
  }

  getS3File(uri: string) {
    // Strip the leading "/" if it exists
    return this.s3.getObject(this.bucket, uri.replace(/^\//, ""));
  }

  async getS3FileContent(uri: string): Promise<string> {
    const stream = await this.getS3File(uri);

    return new Promise((resolve, reject) => {
      let content = "";

      stream.on("data", function (chunk) {
        content += chunk;
      });

      stream.on("end", function () {
        resolve(content);
      });

      stream.on("error", function (err) {
        log.error("stream interrupted when reading S3 file content: ", err);
        reject(err);
      });
    });
  }

  async deleteFileOps(fileId: string) {
    // prevent any ops from being saved while clearing the list
    this.lockFileOps = true;
    await this.redisDel(`file:${fileId}:ops`);
    this.lockFileOps = false;
    // continue processing any items in queue
    this.drainRedisPushQueue();
  }

  saveFileOps(fileId: string, ops: TextOperations) {
    this.redisPushQueue.push({
      key: `file:${fileId}:ops`,
      values: ops.map(ops => JSON.stringify(ops))
    });
    this.drainRedisPushQueue();
  }

  async getFileOps(fileId: string): Promise<TextOperations> {
    const storedOps = await this.redisLRange(`file:${fileId}:ops`, 0, -1);
    return storedOps.map(op => JSON.parse(op));
  }

  async createSnapshot(fileIds: string[]) {
    const modulesToSnapshot = new Set<string>();

    for (const fileId of fileIds) {
      const res = await this.graphql.GetFile({ id: fileId });
      const fileData = res.data?.file_by_pk;

      if (!fileData) {
        throw Error("file does not exist");
      }
      // Add to set so we don't unnecessarily snapshot the same module twice
      modulesToSnapshot.add(
        [
          fileData.branch_name,
          fileData.module_name,
          fileData.module_scope
        ].join("|")
      );
    }
    const results = [];

    for (const mod of modulesToSnapshot.values()) {
      const [branch, name, scope] = mod.split("|");

      results.push(
        this.createModuleSnapshot({
          branch,
          name,
          scope
        })
      );
    }
    return results;
  }

  bumpSnapshotVersion(version: string) {
    const bump = semver.inc(version, "patch");
    if (!bump) {
      throw Error(`invalid version passed to bumpSnapshotVersion: ${version}`);
    }
    return bump;
  }

  async createModuleSnapshot(mod: {
    branch: string;
    name: string;
    scope: string;
  }): Promise<Error | null> {
    log.info(
      `createModuleSnapshot for branch: ${mod.branch}, scope: ${mod.scope}, name: ${mod.name}`
    );
    try {
      // Get all latest files for module
      const latestFilesResponse = await this.graphql.GetModuleVersionFiles({
        ...mod,
        version: "latest"
      });

      const latestFiles = latestFilesResponse.data?.file || [];

      if (!latestFiles.length) {
        throw Error("no latest files found to create snapshot");
      }

      const latestVersion = latestFiles[0].alias?.module_version;

      const snapshotVersion = this.bumpSnapshotVersion(
        latestVersion || this.initialfileVersion
      );
      const updatedAliases = new Map<string, string>();

      let filesChanged = false;

      const filesToCreate = await Promise.all(
        latestFiles.map(async f => {
          if (!f.alias) {
            throw Error("alias property not present on latest file");
          }
          const ops = await this.getFileOps(f.id);

          let contents = await this.getS3FileContent(
            getFileUri(f.alias, { branch: f.alias.branch_name, ext: true })
          );

          if (ops.length) {
            filesChanged = true;
            // We've modified this file so apply the ops.
            contents = applyOps(contents, ops);
          }
          const id = uuidv4();
          updatedAliases.set(f.id, id);

          return {
            ...f,
            id,
            contents,
            module_version: snapshotVersion,
            created_at: this.now(),
            alias_for: undefined
          };
        })
      );

      if (!filesChanged) {
        // no changes since last snapshot
        return Promise.resolve(null);
      }

      let attempts = 0;
      const transaction = async (): Promise<Error | null> => {
        attempts++;

        try {
          // Make sure we update "latest" to now point to the newly created
          // snapshot.
          const fileUpdates = latestFiles.map(f => ({
            id: f.id,
            alias_for: updatedAliases.get(f.id)
          }));
          // Add to s3 (only those files that have content)
          await this.createS3Objects(filesToCreate.filter(f => !!f.contents));
          // Add to index
          await this.graphql.CreateVersionedFiles({
            ...mod,
            version: snapshotVersion,
            // unset contents and alias because our index doesn't expect that field
            files: filesToCreate.map<File>(f => ({
              ...f,
              contents: undefined,
              alias: undefined
            }))
          });
          // Update "latest" files to point to new aliases
          for (const update of fileUpdates) {
            await this.graphql.UpdateAlias({
              id: update.id,
              alias: update.alias_for
            });
            // Reset ops for "latest" file
            await this.deleteFileOps(update.id);
          }

          return null;
        } catch (err) {
          // retry (there are probably a few holes in this at the moment, like not checking graphql errors
          // or ensuring createS3Objects doesn't error if objects already exist).
          log.error("createModuleSnapshot error during transaction: %s", err);
          if (attempts > 2) {
            // TODO: rollback
            log.error(
              "createModuleSnapshot retry limit reached, rolling back."
            );
            return err;
          }
          await sleep(1000);
          return await transaction();
        }
      };
      return await transaction();
    } catch (err) {
      return err;
    }
  }

  async createModule(mod: {
    branch: string;
    name: string;
    scope: string;
  }): Promise<Error | null> {
    const depsFileId = uuidv4();
    const mainFileId = uuidv4();
    const initialModuleFiles: Files = [
      {
        // Alias for latest deps file
        id: uuidv4(),
        alias_for: depsFileId,
        ext: "tsx",
        path: "deps",
        module_version: "latest",
        branch_name: mod.branch,
        module_name: mod.name,
        module_scope: mod.scope,
        mark_deleted: false,
        is_modified: true,
        created_at: this.now()
      },
      {
        // Alias for latest main file
        id: uuidv4(),
        alias_for: mainFileId,
        ext: "tsx",
        path: "main",
        module_version: "latest",
        branch_name: mod.branch,
        module_name: mod.name,
        module_scope: mod.scope,
        mark_deleted: false,
        is_modified: true,
        created_at: this.now()
      },
      {
        id: depsFileId,
        ext: "tsx",
        path: "deps",
        module_version: this.initialfileVersion,
        branch_name: mod.branch,
        module_name: mod.name,
        module_scope: mod.scope,
        mark_deleted: false,
        is_modified: true,
        created_at: this.now(),
        contents: `/**
* ###################
* 
* Module Dependencies
* 
* ###################
*/

`
      },
      {
        id: mainFileId,
        ext: "tsx",
        path: "main",
        module_version: this.initialfileVersion,
        branch_name: mod.branch,
        module_name: mod.name,
        module_scope: mod.scope,
        mark_deleted: false,
        is_modified: true,
        created_at: this.now(),
        contents: `/**
* ###################
* 
* Main ⬇️
* 
* ###################
*/

`
      }
    ];
    try {
      // Add to s3 (all except the latest files which will be stored in Redis)
      await this.createS3Objects(
        initialModuleFiles.filter(f => f.module_version !== "latest")
      );
      // Add to index
      await this.graphql.CreateModule({
        ...mod,
        version: this.initialfileVersion,
        // unset contents because our index doesn't expect that field
        files: initialModuleFiles.map(f => ({ ...f, contents: undefined }))
      });
      return null;
    } catch (err) {
      // TODO: handle specific errors better, perhaps a retry, maybe rollback s3 creation.
      // [Warning] If adding the index fails, we will have orphaned objects in our bucket,
      // which is assumed to be OK because they are extremely cheap, so long as they can
      // be overwritten upon retry.
      return err;
    }
  }
  // Return date in ISO format.
  // TODO: Check Postgres has the correct tz for the entry.
  // https://hasura.io/blog/postgres-date-time-data-types-on-graphql-fd926e86ee87/
  private now() {
    return formatISO(new Date());
  }

  private async createS3Object(file: File) {
    return this.s3.putObject(
      this.bucket,
      getFileUri(file, { branch: file.branch_name, ext: true }),
      file.contents || "",
      {
        "Content-Type": `application/${
          file.ext.startsWith("ts") ? "typescript" : "javascript"
        }`
      }
    );
  }

  private async createS3Objects(files: Files) {
    return Promise.all(files.map(f => this.createS3Object(f)));
  }

  /**
   * Drains the redis queue of edits while guaranteeing order is preserved
   */
  private async drainRedisPushQueue() {
    const push = (key: string, values: string[]) =>
      new Promise(resolve => {
        this.redis.rpush(key, ...values, () => {
          resolve(true);
        });
      });
    let item: RedisQueueItem | undefined;
    while (!this.lockFileOps && (item = this.redisPushQueue.shift())) {
      await push(item.key, item.values);
    }
  }
}

export default ModuleClient;
