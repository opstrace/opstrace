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
 * Get SQL Database with a specific SQL Database name if exists.
 */
export async function getSQLDatabase(
  instanceName: string
): Promise<sql_v1beta4.Schema$Database | false> {
  try {
    const projectId = await getGcpProjectId();
    const res = await sql.databases.get({
      project: projectId,
      instance: instanceName,
      database: "opstrace"
    });
    return res.data ? res.data : false;
  } catch (e) {
    if (e.code === 404) {
      return false;
    }
    throw e;
  }
}

const createSQLDatabase = async ({
  instance
}: {
  instance: sql_v1beta4.Schema$Database;
}) => {
  const projectId = await getGcpProjectId();
  return sql.databases.insert({
    // Project ID of the project to which the newly created Cloud SQL instances should belong.
    project: projectId,
    requestBody: {
      instance: instance.name,
      name: "opstrace",
      project: projectId
    }
  });
};

async function destroySQLDatabase(name: string) {
  const projectId = await getGcpProjectId();
  return sql.databases.delete({
    instance: name,
    database: "opstrace",
    project: projectId
  });
}

export function* ensureSQLDatabaseExists({
  instance
}: {
  instance: sql_v1beta4.Schema$Database;
}): Generator<any, sql_v1beta4.Schema$Database, any> {
  if (!instance.name) {
    throw Error("must provide name for CloudSQLDatabase");
  }
  while (true) {
    const existingSQLDatabase: sql_v1beta4.Schema$Database = yield call(
      getSQLDatabase,
      instance.name
    );

    if (!existingSQLDatabase) {
      try {
        yield call(createSQLDatabase, { instance });
      } catch (e) {
        if (!e.code || (e.code && e.code !== 409)) {
          throw e;
        }
      }
    }

    if (existingSQLDatabase) {
      return existingSQLDatabase;
    }

    yield delay(1 * SECOND);
  }
}

export function* ensureSQLDatabaseDoesNotExist(opstraceClusterName: string) {
  log.info("SQLDatabase teardown: start");

  const SQLDatabaseName = opstraceClusterName;
  while (true) {
    const existingSQLDatabase: sql_v1beta4.Schema$Database = yield call(
      getSQLDatabase,
      SQLDatabaseName
    );

    if (!existingSQLDatabase) {
      log.info("SQLDatabase teardown: desired state reached");
      return;
    }

    try {
      yield call(destroySQLDatabase, SQLDatabaseName);
    } catch (e) {
      if (e.code && e.code === 3) {
        log.info("grpc error 3: %s, retry", e.details);
        continue;
      }

      if (e.code && e.code === 5) {
        log.info("Got grpc error 5 (NOT_FOUND) upon delete. Done.");
        return;
      }
    }

    yield delay(5 * SECOND);
  }
}
