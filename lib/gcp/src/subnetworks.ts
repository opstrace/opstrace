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

import { ApiError as GCPApiError } from "@google-cloud/common";

//@ts-ignore: don't know the reason but have to add one now for ESLint :-).
import Compute from "@google-cloud/compute";
import { die, log, SECOND } from "@opstrace/utils";

// Currently as @google-cloud/compute does not provide typings - it doesn't
// make much sense to fix all lint errors for any
/* eslint-disable @typescript-eslint/no-explicit-any */

// assume one subnet with that name,  not multiple
const doesSubNetworkExist = async (
  client: any,
  { name }: { name: string }
): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    client
      .getSubnetworks()
      .then((data: [any, any]) => {
        if (!data || !Array.isArray(data) || !data[0]) {
          reject("Unexpected data structure returned for getSubnets");
        }
        resolve(
          data[0].find((n: any) => {
            const networkName = n.metadata.network.split("/").pop();
            return networkName === name;
          })
        );
      })
      .catch((err: any) => {
        reject(err);
      });
  });
};

const createSubNetwork = (
  client: any,
  region: string,
  network: string,
  cidr: string,
  name: string
) => {
  return client.region(region).createSubnetwork(name, {
    network,
    range: cidr,
    privateIpGoogleAccess: true
  });
};

const deleteSubNetwork = (
  client: any,
  region: string,
  name: string
): Promise<unknown> => {
  log.debug("emit DELETE api call for subnetwork %s", name);
  return new Promise((resolve, reject) => {
    client
      .region(region)
      .subnetwork(name)
      .delete((err: any, operation: any) => {
        if (err) {
          reject(err);
        }
        resolve(operation);
      });
  });
};

export interface SubnetRequest {
  opstraceClusterName: string;
  gcpRegion: string;
  gcpProjectID: string;
  ipCidrRange: string;
}

export function* ensureSubNetworkExists({
  opstraceClusterName,
  gcpRegion,
  gcpProjectID,
  ipCidrRange
}: SubnetRequest): Generator<unknown, void, unknown> {
  const client = new Compute();

  const snetname = opstraceClusterName;
  const region = gcpRegion;

  while (true) {
    const existingSubNetwork: any = yield call(doesSubNetworkExist, client, {
      name: snetname
    });

    let creationInitiated = false;

    if (existingSubNetwork) {
      log.info("subnetwork found to exist, done");
      break;
    } else {
      if (creationInitiated) {
        yield delay(1 * SECOND);
        continue;
      }
      try {
        yield call(
          createSubNetwork,
          client,
          region,
          `projects/${gcpProjectID}/global/networks/${snetname}`,
          ipCidrRange,
          snetname
        );
      } catch (e) {
        if (e instanceof GCPApiError) {
          log.info(
            "test for JP: e instanceof GCPApiError: %s",
            JSON.stringify(e, null, 2)
          );
        }
        if (e.code === 400) {
          // parent network is not yet ready
          if (e.message && e.message.includes("not yet ready")) {
            log.info("retry in 5 s (%s)", e.message);
            yield delay(5 * SECOND);
            continue;
          }
        }

        if (e.code === 409) {
          log.info("subnetwork created before, done");
          break;
        }

        throw e;
      }
      creationInitiated = true;
    }
  }
}

export function* ensureSubNetworkDoesNotExist(
  opstraceClusterName: string,
  gcpRegion: string
): Generator<unknown, void, unknown> {
  const client = new Compute();

  let operation: any;
  let error: any = null;

  const snetname = opstraceClusterName;
  const region = gcpRegion;

  while (true) {
    log.debug("check if subnetwork exists");
    const existingSubNetwork: any = yield call(doesSubNetworkExist, client, {
      name: snetname
    });

    if (!existingSubNetwork) {
      log.info("subnetwork does not exist, leave");
      return;
    }

    log.debug("existingSubNetwork: %s", existingSubNetwork);

    if (existingSubNetwork.region.name !== gcpRegion) {
      // the gcpRegion passed to this function is "the region to destroy in"
      // if the detected subnetwork region does not match that it really means
      // that we have violated an invariant and need to think things through.
      // Don't just go ahead and delete this sub network.
      die(
        `existingSubNetwork.region.name: ${existingSubNetwork.region.name} ` +
          `vs. region to destroy in: ${gcpRegion}`
      );
    }

    if (error) {
      throw error;
    }
    if (operation) {
      log.info(
        "subnetwork deletion operation was initiated, wait for subnetwork to disappear"
      );
      yield delay(10 * SECOND);

      continue;
    }

    try {
      operation = yield call(deleteSubNetwork, client, region, snetname);
      log.debug("subnetwork deletion: operation: %s", operation);
      operation.on("complete", (metadata: any) => {
        // The operation is complete.
        operation.removeAllListeners();
        operation = null;
        log.info(
          `Subnet deletion is: ${metadata.status} with ${metadata.progress} % progress`
        );
      });
      //-
      // You can register a listener to monitor when the operation begins running.
      //-
      operation.on("running", (metadata: any) => {
        // The operation is running.
        log.info(`Subnet deletion has started with status: ${metadata.status}`);
      });
      //-
      // Be sure to register an error handler as well to catch any issues which
      // impeded the operation.
      //-
      operation.on("error", (err: any) => {
        // An error occurred during the operation.
        operation.removeAllListeners();
        operation = null;
        error = err;
      });
    } catch (e) {
      if (e instanceof GCPApiError) {
        log.info(
          "test for JP: e instanceof GCPApiError: %s",
          JSON.stringify(e, null, 2)
        );
      }
      if (!e.code || (e.code && e.code !== 404)) {
        throw e;
      }

      log.debug("error during subnetwork deletion: %s", e);
    }

    yield delay(5 * SECOND);
  }
}
