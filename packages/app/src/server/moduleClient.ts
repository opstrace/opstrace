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
import { promisify } from "util";
import redis from "redis";
import formatISO from "date-fns/formatISO";
import { v4 as uuidv4 } from "uuid";
import env from "./env";
import graphqlClient, { File_Insert_Input } from "state/clients/graphqlClient";
import { TextOperations } from "state/file/types";
import { log } from "@opstrace/utils";
import { applyOps } from "state/file/utils/ops";
import { sleep } from "state/utils/time";
import semver from "semver";
import { CompilerOutput } from "workers/types";

function createRedisClient(): redis.RedisClient {
  return redis.createClient({
    host: env.REDIS_HOST,
    password: env.REDIS_PASSWORD
  });
}

type RedisQueueItem = { key: string; values: string[] };

class ModuleClient {
  graphql = graphqlClient;
  redis = createRedisClient();
  redisGet: (arg1: string) => Promise<string | null>;
  redisSet: (arg1: string, arg2: string) => Promise<unknown>;
  redisLRange: (arg1: string, arg2: number, arg3: number) => Promise<string[]>;
  redisDel: (arg1: string) => Promise<number>;
  private redisPushQueue: RedisQueueItem[] = [];
  private lockFileOps = false;

  private initialfileVersion = "0.0.1";
  constructor() {
    this.redisGet = promisify(this.redis.get).bind(this.redis);
    this.redisSet = promisify(this.redis.set).bind(this.redis);
    this.redisLRange = promisify(this.redis.lrange).bind(this.redis);
    this.redisDel = promisify(this.redis.del).bind(this.redis);
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

  async saveCompilerOutput(fileId: string, compilerOutput: CompilerOutput) {
    await this.redisSet(
      `file:${fileId}:compiled_output`,
      JSON.stringify(compilerOutput)
    );
  }

  async getCompilerOutput(fileId: string): Promise<CompilerOutput> {
    const res = await this.redisGet(`file:${fileId}:compiled_output`);
    if (res) {
      return JSON.parse(res) as CompilerOutput;
    }
    const graphqlRes = await this.graphql.GetCompiledOutput({ id: fileId });
    const data = graphqlRes.data?.file_by_pk;
    if (data) {
      return {
        js: data.js || "",
        dts: data.dts || "",
        sourceMap: data.map || "",
        errors: data.compile_errors
      };
    }
    return {
      js: "",
      dts: "",
      sourceMap: "",
      errors: []
    };
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
      const latestModuleVersionRes =
        latestFilesResponse.data?.module_version || [];
      const latestModuleVersion =
        (latestModuleVersionRes.length && latestModuleVersionRes[0].version) ||
        this.initialfileVersion;

      if (!latestFiles.length) {
        throw Error("no latest files found to create snapshot");
      }

      const snapshotVersion = this.bumpSnapshotVersion(latestModuleVersion);
      const updatedContent = new Map<
        string,
        CompilerOutput & { contents: string }
      >();

      let filesChanged = false;

      const filesToCreate = await Promise.all(
        latestFiles.map(async f => {
          const ops = await this.getFileOps(f.id);
          const compilerOutput = await this.getCompilerOutput(f.id);

          let contents = f.contents;

          if (ops.length) {
            filesChanged = true;
            // We've modified this file so apply the ops.
            contents = applyOps(contents, ops);
          }
          const id = uuidv4();
          updatedContent.set(f.id, { contents, ...compilerOutput });

          const file: File_Insert_Input = {
            ...f,
            id,
            contents,
            dts: compilerOutput.dts,
            js: compilerOutput.js,
            map: compilerOutput.sourceMap,
            compile_errors: compilerOutput.errors,
            module_version: snapshotVersion,
            created_at: this.now()
          };
          return file;
        })
      );

      if (!filesChanged) {
        // no changes since last snapshot
        return Promise.resolve(null);
      }

      let attempts = 0;
      const attempt = async (): Promise<Error | null> => {
        attempts++;

        try {
          const fileUpdates: (CompilerOutput & {
            id: string;
            contents: string;
          })[] = [];

          latestFiles.forEach(f => {
            const update = updatedContent.get(f.id);
            if (!update) return;

            fileUpdates.push({
              id: f.id,
              contents: update.contents,
              dts: update.dts,
              js: update.js,
              sourceMap: update.sourceMap,
              errors: update.errors
            });
          });
          // Add to index
          await this.graphql.CreateVersionedFiles({
            ...mod,
            version: snapshotVersion,
            files: filesToCreate
          });

          for (const update of fileUpdates) {
            await this.graphql.UpdateContents({
              id: update.id,
              contents: update.contents,
              dts: update.dts || "",
              js: update.js || "",
              map: update.sourceMap || "",
              errors: update.errors
            });
            // Reset ops for "latest" file
            await this.deleteFileOps(update.id);
          }

          return null;
        } catch (err) {
          log.error("createModuleSnapshot error during attempt: %s", err);
          if (attempts > 2) {
            // TODO: rollback
            log.error(
              "createModuleSnapshot retry limit reached, rolling back."
            );
            return err;
          }
          await sleep(1000);
          return await attempt();
        }
      };
      return await attempt();
    } catch (err) {
      return err;
    }
  }

  // Return date in ISO format.
  // TODO: Check Postgres has the correct tz for the entry.
  // https://hasura.io/blog/postgres-date-time-data-types-on-graphql-fd926e86ee87/
  private now() {
    return formatISO(new Date());
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
