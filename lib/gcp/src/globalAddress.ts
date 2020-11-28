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
import { google, compute_v1 } from "googleapis";
import { SECOND, log } from "@opstrace/utils";
import { getGcpProjectId } from "./cluster";

// Use global addresses
const addresses = google.compute("v1").globalAddresses;

async function getAddress({
  name
}: {
  name: string;
}): Promise<compute_v1.Schema$Address | false> {
  try {
    const project = await getGcpProjectId();
    // the api is super confusing here - docs say to use name, this sdk suggests address, but looks like
    // it's actually supposed to be the name used during creation...
    const res = await addresses.get({ address: name, project });

    return res.data ? res.data : false;
  } catch (e) {
    if (e.code === 404) {
      return false;
    }
    throw e;
  }
}

async function createAddress({
  name,
  network,
  region,
  ipCidrRange
}: {
  name: string;
  network: string;
  region: string;
  ipCidrRange: string;
}) {
  const project = await getGcpProjectId();
  const res = await addresses.insert({
    project,
    requestBody: {
      address: ipCidrRange,
      addressType: "INTERNAL",
      ipVersion: "IPV4",
      name,
      network,
      prefixLength: 19,
      purpose: "VPC_PEERING",
      region
    }
  });

  return res.data ? res.data : false;
}

async function deleteAddress({ name }: { name: string }) {
  const project = await getGcpProjectId();
  // the api is super confusing here - docs say to use name, this sdk suggests address, but looks like
  // it's actually supposed to be the name used during creation...
  await addresses.delete({ address: name, project });
}

export function* ensureAddressExists({
  addressName,
  network,
  region,
  ipCidrRange
}: {
  addressName: string;
  network: string;
  region: string;
  ipCidrRange: string;
}) {
  log.info("create global Address: %s", addressName);
  while (true) {
    const address: compute_v1.Schema$Address = yield call(getAddress, {
      name: addressName
    });

    if (address) {
      log.info(`Global Address is ${address.status}`);
    }

    if (
      address &&
      (address.status === "RESERVED" || address.status === "IN_USE")
    ) {
      return address;
    }

    try {
      log.info("call createAddress()");
      yield call(createAddress, {
        name: addressName,
        network,
        region,
        ipCidrRange
      });
    } catch (e) {
      if (!e.code || (e.code && e.code !== 409)) {
        throw e;
      }
    }

    yield delay(5 * SECOND);
  }
}

export function* ensureAddressDoesNotExist({
  addressName
}: {
  addressName: string;
}) {
  while (true) {
    const address = yield call(getAddress, { name: addressName });

    if (!address) {
      log.info("Global Address teardown: desired state reached");
      return;
    }

    log.info(`Global Address is ${address.state}`);

    try {
      yield call(deleteAddress, {
        name: addressName
      });
    } catch (e) {
      if (!e.code || (e.code && e.code !== 409)) {
        throw e;
      }
    }
    yield delay(2 * SECOND);
  }
}
