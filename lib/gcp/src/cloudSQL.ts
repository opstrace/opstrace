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
    const res = await serviceNetworking.services.connections.create({
      parent: "services/servicenetworking.googleapis.com",
      requestBody: {
        network,
        reservedPeeringRanges: [addressName],
        service: "servicenetworking.googleapis.com"
      }
    });

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
  instance: sql_v1beta4.Schema$DatabaseInstance;
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
  // If we move too quickly with creating the instance after a peering request,
  // we'll get an error. Usually the second retry will succeed.
  // To save us some errors in our logs, just wait a bit here.
  // Would be nice to find a clean way to wait for the peering to be complete
  // but I couldn't find anything to help me with that.
  yield delay(10 * SECOND);

  log.info(`Ensure SQLInstance exists`);
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
