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
import { log, SECOND } from "@opstrace/utils";
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

async function peerVpcs({
  addressName,
  network
}: {
  addressName: string;
  network: string;
}) {
  try {
    // Note(JP): the response represents a long-running operation. Also see
    // https://cloud.google.com/service-infrastructure/docs/service-networking/reference/rest/v1/operations#Operation
    // "This resource represents a long-running operation that is the result of
    // a network API call."" The right thing to do is to use that to follow
    // progress.
    // https://cloud.google.com/service-infrastructure/docs/service-networking/reference/rest/v1/services.connections/create
    // "If successful, the response body contains a newly created instance of Operation."
    const res = await serviceNetworking.services.connections.create({
      parent: "services/servicenetworking.googleapis.com",
      requestBody: {
        network,
        reservedPeeringRanges: [addressName],
        service: "servicenetworking.googleapis.com"
      }
    });

    // There should be a `metadata` key in here somewhere indicating the
    // progress of the long-running operation.
    log.debug("services.connections.create result Operation: %s", res);

    if (res.data.error) {
      log.error(
        "failed creating service peering for cloudSQL and cluster vpc: %",
        res.data.error
      );
    }
  } catch (e) {
    log.error(
      "failed creating service peering for cloudSQL and cluster vpc: %",
      e
    );
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
