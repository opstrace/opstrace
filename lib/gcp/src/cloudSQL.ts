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

import { call, delay, CallEffect } from "redux-saga/effects";
import { google, sql_v1beta4 } from "googleapis";
import { log, SECOND, sleep } from "@opstrace/utils";
import {
  ensureSQLInstanceDoesNotExist,
  ensureSQLInstanceExists
} from "./cloudSQLInstance";
import {
  ensureSQLDatabaseDoesNotExist,
  ensureSQLDatabaseExists
} from "./cloudSQLDatabase";
import {
  ensureAddressDoesNotExist,
  ensureAddressExists
} from "./globalAddress";

const serviceNetworking = google.servicenetworking("v1");

const cloudresourcemanager = google.cloudresourcemanager("v1");

async function peerVpcs({
  addressName,
  network
}: {
  addressName: string;
  network: string;
}) {
  const logpfx = "setup peering cloudSQL-clustervpc";

  // Note(JP): the response represents a long-running operation. Also see
  // https://cloud.google.com/service-infrastructure/docs/service-networking/reference/rest/v1/operations#Operation
  // "This resource represents a long-running operation that is the result of a
  // network API call." The right thing to do is to use that to follow
  // progress.
  // https://cloud.google.com/service-infrastructure/docs/service-networking/reference/rest/v1/services.connections/create
  // "If successful, the response body contains a newly created instance of
  // Operation." Also see https://github.com/opstrace/opstrace/issues/293 for
  // the importance of following the long-running operation, inspect and log
  // its errors state etc.

  let operationName: string;
  let attempt = 0;
  while (true) {
    attempt += 1;

    // Trigger CREATE
    let result: any;
    try {
      result = await serviceNetworking.services.connections.create({
        parent: "services/servicenetworking.googleapis.com",
        requestBody: {
          network,
          reservedPeeringRanges: [addressName],
          service: "servicenetworking.googleapis.com"
        }
      });
    } catch (err) {
      log.error(`${logpfx}: error during services.connections.create: ${err}`);
    }
    log.debug(`${logpfx}: services.connections.create result: ${result}`);

    // filter for success, exit loop in that case
    if (result !== undefined && result.data !== undefined) {
      const response = result.data;
      if (response.name !== undefined) {
        log.info(`${logpfx}: started log-running operation: ${response.name}`);

        // This is something like "operations/pssn.p24-948748128269-bfaca658-11c7-4a9c-821b-b1dafc37231f"
        operationName = response.name;
        // Enter loop for following operation progress (as of the time of
        // writing this is not timeout-controlled, and waits forever until
        // operation either fails permanently or succeeds)
        if (await waitForLongrunningOperationToSucceed(logpfx, operationName)) {
          log.info(`${logpfx}: operation completed, leave peerVpcs()`);
          return;
        } else {
          log.info(
            `${logpfx}: operation resulted in permanent error, retry creation from scratch`
          );
        }
      }
    }

    log.info(
      `${logpfx}: connections.create(): attempt ${attempt} failed, retry soon`
    );
    await sleep(5);
  }
}

/**
 * Following operation progress. Wait forever until operation either fails
 * permanently or succeeds.
 *
 * https://cloud.google.com/resource-manager/reference/rest/v1/operations/get
 * https://cloud.google.com/build/docs/api/reference/rest/v1/operations
 *
 * @param operationName: a string of the shape operations/pssn.p24-948748128269-bfaca658-11c7-4a9c-821b-b1dafc37231f
 * @param logpfx: a log message prefix added to all log messages, for retaining context
 * @returns `true` upon success or `false` upon (permanent) failure.
 */
async function waitForLongrunningOperationToSucceed(
  operationName: string,
  logpfx: string
): Promise<boolean> {
  log.info(`${logpfx}: follow long-running operation ${operationName}`);

  let attempt = 0;
  while (true) {
    attempt += 1;

    // Get current operation status
    let result: any;
    try {
      result = await cloudresourcemanager.operations.get({
        name: operationName
      });
    } catch (err) {
      log.error(`${logpfx}: error during operations.get: ${err}`);
    }
    log.debug(`${logpfx}: operations.get result: ${result}`);

    // Filter for success, exit loop in that case.
    if (result !== undefined && result.data !== undefined) {
      // Anatomy of an Operations object:
      // https://cloud.google.com/resource-manager/reference/rest/Shared.Types/Operation
      // https://cloud.google.com/resource-manager/reference/rest/Shared.Types/Operation#Status
      const operation = result.data;

      // Docs about `operation.metadata`: "Service-specific metadata associated
      // with the operation. It typically contains progress information and
      // common metadata such as create time"
      log.info(
        `${logpfx}: current operation status: ${JSON.stringify(
          operation,
          null,
          2
        )}`
      );

      if (operation.error !== undefined) {
        // Note(JP): As of docs this means that the error is permanent, i.e.
        // there is no point in waiting for this operation to succeed anymore.
        // Instead, we should retry creating that operation -- indicate that by
        // returning `false`.
        log.info(
          `${logpfx}: operation failed: ${JSON.stringify(
            operation.error,
            null,
            2
          )}`
        );

        // Be sure to also log all error detail, documented with "A list of
        // messages that carry the error details."
        log.debug(
          `${logpfx}: operation failed, err.details: ${JSON.stringify(
            operation.error.details,
            null,
            2
          )}`
        );

        return false;
      }

      if (operation.response !== undefined) {
        // "The normal response of the operation in case of success"
        log.info(
          `${logpfx}: operation seems to have successfully completed. ` +
            `Response: ${JSON.stringify(operation.response, null, 2)}`
        );

        if (!operation.done) {
          // Docs says "if true, the operation is completed, and either error
          // or response is available.". If that is not true then emit warning,
          // but don't consider this failed.
          log.warning(
            `${logpfx}: operation has response, but 'done' is not true yet`
          );
        }

        // Indicate operation success to caller.
        return true;
      }
    }

    log.info(
      `${logpfx}: follow operations ${operationName}: attempt ${attempt} done, retry soon`
    );
    await sleep(5);
  }
}

export function* ensureCloudSQLExists({
  instance,
  addressName,
  network,
  region,
  ipCidrRange,
  opstraceClusterName
}: {
  addressName: string;
  network: string;
  region: string;
  ipCidrRange: string;
  opstraceClusterName: string;
  instance: sql_v1beta4.Schema$DatabaseInstance; // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): Generator<CallEffect, sql_v1beta4.Schema$DatabaseInstance, any> {
  log.info(`Ensuring CloudSQL exists`);

  const auth = new google.auth.GoogleAuth({
    scopes: [
      "https://www.googleapis.com/auth/cloud-platform",
      "https://www.googleapis.com/auth/sqlservice.admin",
      "https://www.googleapis.com/auth/compute",
      "https://www.googleapis.com/auth/compute.readonly",
      "https://www.googleapis.com/auth/service.management"
    ]
  });

  google.options({ auth });

  log.info(`Ensure Address exists`);
  yield call(ensureAddressExists, {
    region,
    addressName,
    network,
    ipCidrRange
  });

  log.info(`Peering cluster vpc with cloudSQL services vpc`);
  yield call(peerVpcs, { network, addressName });

  // Note(JP): The creation API call may fail with `Invalid request: Incorrect
  // Service Networking config for instance:
  // ci-shard-ddd:pr-upgr-bk-5334-24e-g-1628080548325:NETWORK_NOT_PEERED.`
  // Consider this retryable. Retrying for 2 minutes is sometimes not enough.
  // Retry much longer. Also see
  // https://github.com/opstrace/opstrace/issues/293 The network creation API
  // call triggers a long-running operation (see above). That is, when the
  // create API call succeeds this does not imply that the creation will indeed
  // succeed. To make things robust, we need to follow the operation and wait
  // for it to succeed or fail -- when it fails, the create needs to be
  // retried.
  let attemptNumber = 0;
  const sqlInstanceCreationDeadline = Date.now() + 15 * 60 * SECOND;

  log.info(`Ensure SQLInstance exists`);

  while (sqlInstanceCreationDeadline > Date.now()) {
    log.info(`Attempt ${attemptNumber++} to create SQLInstance`);
    yield delay(15 * SECOND);

    try {
      const existingInstance: sql_v1beta4.Schema$DatabaseInstance = yield call(
        ensureSQLInstanceExists,
        { instance, opstraceClusterName }
      );

      if (!existingInstance.name) {
        throw Error("SQLInstance did not return a name");
      }

      log.info(`Ensure SQLDatabase exists`);
      yield call(ensureSQLDatabaseExists, { opstraceClusterName });

      return existingInstance;
    } catch (err) {
      log.debug("Creating SQLInstance failed, retrying: %s", err);
    }
  }
  throw Error(
    `SQLInstance creation deadline hit after ${attemptNumber} attempts`
  );
}

export function* ensureCloudSQLDoesNotExist({
  opstraceClusterName,
  addressName
}: {
  opstraceClusterName: string;
  addressName: string;
}): Generator<CallEffect, void, unknown> {
  const auth = new google.auth.GoogleAuth({
    scopes: [
      "https://www.googleapis.com/auth/cloud-platform",
      "https://www.googleapis.com/auth/sqlservice.admin",
      "https://www.googleapis.com/auth/compute",
      "https://www.googleapis.com/auth/compute.readonly",
      "https://www.googleapis.com/auth/service.management"
    ]
  });

  google.options({ auth });
  log.info(`Ensure SQLDatabase deletion`);
  yield call(ensureSQLDatabaseDoesNotExist, opstraceClusterName);
  log.info(`Ensure SQLInstance deletion`);
  yield call(ensureSQLInstanceDoesNotExist, opstraceClusterName);
  log.info(`Ensure Address deletion`);
  yield call(ensureAddressDoesNotExist, { addressName });
}
