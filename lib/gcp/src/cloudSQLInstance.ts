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

import { delay, call } from "redux-saga/effects";
import { google, sql_v1beta4 } from "googleapis";

import { getGcpProjectId } from "./cluster";

import { SECOND, log } from "@opstrace/utils";

const sql = google.sql("v1beta4");

/**
 * Get SQL Instance with a specific SQL Instance name if it exists.
 */
export async function getSQLInstance(
  instanceName: string
): Promise<sql_v1beta4.Schema$DatabaseInstance | false> {
  try {
    const projectId = await getGcpProjectId();
    const res = await sql.instances.get({
      project: projectId,
      instance: instanceName
    });
    return res.data ? res.data : false;
  } catch (e) {
    if (e.code === 404) {
      return false;
    }
    throw e;
  }
}

const createSQLInstance = async ({
  instance
}: {
  instance: sql_v1beta4.Schema$DatabaseInstance;
}) => {
  const projectId = await getGcpProjectId();
  return sql.instances.insert({
    // Project ID of the project to which the newly created Cloud SQL instances should belong.
    project: projectId,
    requestBody: instance
  });
};

async function destroySQLInstance(instanceName: string) {
  const projectId = await getGcpProjectId();
  return sql.instances.delete({ project: projectId, instance: instanceName });
}

export function* ensureSQLInstanceExists({
  instance
}: {
  instance: sql_v1beta4.Schema$DatabaseInstance;
}): Generator<any, sql_v1beta4.Schema$DatabaseInstance, any> {
  if (!instance.name) {
    throw Error("must provide name for CloudSQLInstance");
  }
  while (true) {
    const existingSQLInstance: sql_v1beta4.Schema$DatabaseInstance = yield call(
      getSQLInstance,
      instance.name
    );

    if (!existingSQLInstance) {
      try {
        yield call(createSQLInstance, { instance });
      } catch (e) {
        if (!e.code || (e.code && e.code !== 409)) {
          throw e;
        }
      }
    }
    if (existingSQLInstance) {
      log.info(`SQLInstance is ${existingSQLInstance.state}`);
    }

    if (existingSQLInstance && existingSQLInstance.state === "RUNNABLE") {
      return existingSQLInstance;
    }

    if (existingSQLInstance && existingSQLInstance.state === "FAILED") {
      throw Error("Failed to create SQL Instance");
    }

    yield delay(10 * SECOND);
  }
}

export function* ensureSQLInstanceDoesNotExist(opstraceClusterName: string) {
  log.info("SQLInstance teardown: start");

  const SQLInstanceName = opstraceClusterName;
  while (true) {
    const existingSQLInstance: sql_v1beta4.Schema$DatabaseInstance = yield call(
      getSQLInstance,
      SQLInstanceName
    );

    if (!existingSQLInstance) {
      log.info("SQLInstance teardown: desired state reached");
      return;
    }

    log.info(`SQLInstance is ${existingSQLInstance.state}`);

    if (existingSQLInstance.state === "STOPPING") {
      yield delay(10 * SECOND);

      continue;
    }

    try {
      yield call(destroySQLInstance, SQLInstanceName);
    } catch (e) {
      if (e.code && e.code === 3) {
        log.info("grpc error 3: %s, retry", e.details);
        continue;
      }

      if (e.code && e.code === 5) {
        log.info("Got grpc error 5 (NOT_FOUND) upon delete. Done.");
        return;
      }
      throw e;
    }
  }
}
