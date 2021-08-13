/**
 * Copyright 2021 Opstrace, Inc.
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

import { Response as GotResponse } from "got";
import { httpcl, log, SECOND } from "@opstrace/utils";
import { KubeConfig } from "@kubernetes/client-node";
import { State } from "../reducer";
import { getControllerConfig } from "../helpers";
import { delay, select } from "redux-saga/effects";

// Variable to store the cached GKE version to avoid spamming the Kubernetes API
// server.
let cachedGKEVersion: {
  major: string | undefined;
  minor: string | undefined;
} = {
  major: undefined,
  minor: undefined
};

// Checks if the API server version matches the given major and minor version.
export function isGKEVersion(
  major: string,
  minor: string
): boolean | undefined {
  log.debug(
    `checking if GKE version is major=${major} minor=${minor} cachedVersion=${JSON.stringify(
      cachedGKEVersion
    )}`
  );

  if (
    cachedGKEVersion.major === undefined ||
    cachedGKEVersion.minor === undefined
  ) {
    log.info("GKE version is not cached yet");
    return undefined;
  }

  return cachedGKEVersion.major === major && cachedGKEVersion.minor === minor;
}

// If the instance is hosted on GCP then fetch the GKE version and cache it.
// Retry every 10 seconds if an error occurs.
export function* fetchGKEVersion(
  kubeConfig: KubeConfig
  /* eslint-disable @typescript-eslint/no-explicit-any */
): Generator<unknown, void, any> {
  const state: State = yield select();
  const { target } = getControllerConfig(state);

  if (target !== "gcp") {
    log.debug(`skip fetching API server version`);
    return;
  }

  log.info(`fetching GKE version`);

  while (true) {
    if (kubeConfig.getCurrentCluster() === null) {
      throw new Error(
        `kubeconfig not configured properly, it is missing a cluster definition`
      );
    }
    const cluster = kubeConfig.getCurrentCluster();
    const server = cluster?.server;
    const endpoint = `${server}/version`;

    const res: GotResponse<string> | undefined = yield httpcl(endpoint, {
      https: { rejectUnauthorized: false }
    });

    if (res === undefined) {
      log.error(`failed to fetch Kubernetes API server version, `);
      yield delay(10 * SECOND);
      continue;
    }

    cachedGKEVersion = JSON.parse(res.body);
    log.info(
      `got Kubernetes API server version: ${JSON.stringify(cachedGKEVersion)}`
    );
    break;
  }
}
