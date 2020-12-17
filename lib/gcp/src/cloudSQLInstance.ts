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

import { delay, call, CallEffect } from "redux-saga/effects";
import { google, sql_v1beta4 } from "googleapis";

import { getGcpProjectId } from "./cluster";

import { SECOND, log } from "@opstrace/utils";

const sql = google.sql("v1beta4");

/**
 * Get SQL Instance with a specific SQL Instance name if it exists.
 */
export async function getSQLInstance(
  clusterName: string
): Promise<sql_v1beta4.Schema$DatabaseInstance | false> {
  try {
    const projectId = await getGcpProjectId();
    const res = await sql.instances.list({
      project: projectId,
      filter: `settings.userLabels.opstrace_cluster_name:${clusterName}`
    });
    if (res.data && res.data.items?.length) {
      return res.data.items[0];
    }
    return false;
  } catch (e) {
    if (e.code === 404) {
      return false;
    }
    throw e;
  }
}

/**
 * Get the CloudSQL instance NAME in RUNNABLE state associated with this Opstrace cluster, or false.
 * @param opstraceClusterName
 */
export async function getRunnableSQLInstanceName(
  opstraceClusterName: string
): Promise<string | boolean> {
  const instance = await getSQLInstance(opstraceClusterName);
  if (!instance || instance.state !== "RUNNABLE" || !instance.name) {
    return false;
  }
  return instance.name ? instance.name : false;
}

const createSQLInstance = async ({
  instance
}: {
  instance: sql_v1beta4.Schema$DatabaseInstance;
}) => {
  log.info("create SQLInstance");
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
  opstraceClusterName,
  instance
}: {
  opstraceClusterName: string;
  instance: sql_v1beta4.Schema$DatabaseInstance;
}): Generator<CallEffect, sql_v1beta4.Schema$DatabaseInstance, any> {
  // Ensure instance has the correct label - this is the primary method for
  // correlating an instance with an Opstrace cluster.
  instance.settings!.userLabels!.opstrace_cluster_name = opstraceClusterName;
  // Create a random name for the instance to avoid the following constraint:
  // When you delete an instance, you cannot reuse the name of the deleted instance until one week from the deletion date.
  // There is an 82 char limit for instance names - we are fine using ~13 chars for the unix time suffix
  instance.name = `${opstraceClusterName}-${Date.now()}`;
  instance.connectionName = instance.name;

  while (true) {
    const existingSQLInstance: sql_v1beta4.Schema$DatabaseInstance = yield call(
      getSQLInstance,
      opstraceClusterName
    );

    if (existingSQLInstance) {
      log.info(`SQLInstance is ${existingSQLInstance.state}`);

      if (existingSQLInstance.state === "RUNNABLE") {
        return existingSQLInstance;
      }

      if (existingSQLInstance.state === "FAILED") {
        throw Error("Failed to create SQL Instance");
      }

      yield delay(10 * SECOND);
      continue;
    }
    // Don't bother catching errors here because GCP has some quirks.
    // A 409 here doesn't necessarily mean that the instance has been created, therefore you're good to go.
    // A 409 can also return this error message:
    // "message": "The Cloud SQL instance already exists. When you delete an instance, you cannot reuse the name of the deleted instance until one week from the deletion date."
    yield call(createSQLInstance, { instance });
  }
}

export function* ensureSQLInstanceDoesNotExist(
  opstraceClusterName: string
): Generator<CallEffect, void, any> {
  log.info("SQLInstance teardown: start");

  while (true) {
    const existingSQLInstance: sql_v1beta4.Schema$DatabaseInstance = yield call(
      getSQLInstance,
      opstraceClusterName
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
    if (!existingSQLInstance.name) {
      throw Error("Found existing SQLInstance but it doesn't have a name");
    }
    try {
      yield call(destroySQLInstance, existingSQLInstance.name);
    } catch (e) {
      if (!e.code || (e.code && e.code !== 404)) {
        throw e;
      }
    }
  }
}
