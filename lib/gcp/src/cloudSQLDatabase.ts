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
import { getRunnableSQLInstanceName } from "./cloudSQLInstance";

const sql = google.sql("v1beta4");

/**
 * Get SQL Database with a specific SQL Database name if exists.
 */
export async function getSQLDatabase(
  opstraceClusterName: string
): Promise<sql_v1beta4.Schema$Database | false> {
  try {
    // First check if the instance is available and running, because we'll get a 400 status
    // if we try to read a database from an instance that is not RUNNABLE, and we can't have
    // a database if our instance isn't running.
    const instanceName = await getRunnableSQLInstanceName(opstraceClusterName);
    if (!instanceName) {
      return false;
    }
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
  opstraceClusterName
}: {
  opstraceClusterName: string;
}) => {
  log.info("create SQLDatabase");
  const projectId = await getGcpProjectId();
  const instanceName = await getRunnableSQLInstanceName(opstraceClusterName);
  if (!instanceName) {
    return false;
  }
  return sql.databases.insert({
    // Project ID of the project to which the newly created Cloud SQL instances should belong.
    project: projectId,
    instance: instanceName,
    requestBody: {
      instance: instanceName,
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
  opstraceClusterName
}: {
  opstraceClusterName: string; // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): Generator<any, sql_v1beta4.Schema$Database, any> {
  while (true) {
    const existingSQLDatabase: sql_v1beta4.Schema$Database = yield call(
      getSQLDatabase,
      opstraceClusterName
    );

    if (!existingSQLDatabase) {
      try {
        yield call(createSQLDatabase, { opstraceClusterName });
      } catch (e) {
        /**
         Google api returns a 400 (not the expected 409) if the database already exists...

         "data": {
          "error": {
            "code": 400,
            "message": "Invalid request: failed to create database opstrace. Detail: pq: database \"opstrace\" already exists\n.",
            "errors": [
              {
                "message": "Invalid request: failed to create database opstrace. Detail: pq: database \"opstrace\" already exists\n.",
                "domain": "global",
                "reason": "invalid"
              }
            ]
          }
        },
         */
        if (
          !e.code ||
          (e.code &&
            e.code !== 400 &&
            /already exists/.test(e.response?.data?.error?.message))
        ) {
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

export function* ensureSQLDatabaseDoesNotExist(
  opstraceClusterName: string // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Generator<any, void, any> {
  log.info("SQLDatabase teardown: start");

  while (true) {
    const existingSQLDatabase: sql_v1beta4.Schema$Database = yield call(
      getSQLDatabase,
      opstraceClusterName
    );

    if (!existingSQLDatabase) {
      log.info("SQLDatabase teardown: desired state reached");
      return;
    }

    if (!existingSQLDatabase.instance) {
      throw Error("found SQLDatabase with no instance field");
    }

    try {
      yield call(destroySQLDatabase, existingSQLDatabase.instance);
    } catch (e) {
      if (!e.code || (e.code && e.code !== 404)) {
        throw e;
      }
    }

    yield delay(5 * SECOND);
  }
}
