/**
 * Copyright 2020 Opstrace, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");

      // Handle transient/retryable errors here, mainly TCP connect() timeout
      // For context, see opstrace-prelaunch/issues/1039 and
      // https://github.com/kubernetes-client/javascript/issues/544
      // TODO: handle other transient ones, ENOUTFOUND and 5xx HTTP responses.
      if (e.code && e.code === "ETIMEDOUT") {
        log.info("retry config map creation/update soon (%s)", e.message);
        await sleep(3);
        continue;
      }* you may not use this file except in compliance with the License.
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

export * from "./equality";
export * from "./crds";
export * from "./custom-resources";
export * from "./kinds";
export * from "./common";
export * from "./utils";
export * from "./api";
export * from "./readiness";
export * from "./errors";
export * from "./types";
export * from "./reconciliation";

import { ConfigMap } from "./kinds";
import { log, sleep, mtime, mtimeDeadlineInSeconds } from "@opstrace/utils";

// Used by installer/uninstaller for robust config map creation/update,
// useful logging. Context: opstrace-prelaunch/issues/1039

/**
 *
 * @param cm
 * @param forceUpdate: skip initial CREATE attempt. Expected to fail when the
 *  config map does not exist yet.
 * @param forceCreate: error out when seeing a 409 response indicating that the
 * config map already exists (re-throw 409 error in this case)
 */

export async function createOrUpdateConfigMapWithRetry(
  cm: ConfigMap,
  opts: {
    forceUpdate?: boolean;
    forceCreate?: boolean;
  } = {
    forceUpdate: false,
    forceCreate: false
  }
): Promise<void> {
  if (opts.forceUpdate && opts.forceCreate) {
    // programmer error
    throw new Error("must not set both, forceCreate and forceUpdate");
  }

  // For choosing the overall operation deadline note that the connect()
  // timeout control for the underlying HTTP client is not yet working well --
  // might take ~2 minutes, see
  // https://github.com/kubernetes-client/javascript/issues/544
  const maxWaitSeconds = 300;
  const deadline = mtimeDeadlineInSeconds(maxWaitSeconds);

  // 409 response: authoritative signal that we have to switch to PATCH
  // operation (could do the inverse: start with PATCH, and use 404 as
  // authoritative signal to switch to POST/PUT/create).
  let seen409 = false;
  let cycle = 0;

  log.info("create/update config map %s / %s", cm.namespace, cm.name);

  async function create(i: number) {
    log.debug("call cm.create() (attempt %s)", i);
    await cm.create();
    log.info("config map created (attempt %s)", i);
  }

  async function update(i: number) {
    log.debug("call cm.update() (attempt %s)", i);
    await cm.update();
    log.info("config map updated (attempt %s)", i);
  }

  while (true) {
    cycle++;

    if (mtime() > deadline) {
      log.error("config map create/update deadline hit (%s s)", maxWaitSeconds);
      throw new Error("config map create/update deadline hit");
    }

    try {
      if (opts.forceUpdate || seen409) {
        // fallback from create to update (if `forceCreate` is `false` )
        await update(cycle);
      } else {
        await create(cycle);
      }
    } catch (e) {
      if (e.response === undefined) {
        // Handle transient/retryable errors here, mainly TCP connect() timeout
        // For context, see opstrace-prelaunch/issues/1039 and
        // https://github.com/kubernetes-client/javascript/issues/544
        // and also other transient ones, ENOUTFOUND
        if (e.code) {
          // for example: e.code === "ETIMEDOUT"
          log.info("retry config map creation/update soon (%s)", e.message);
          await sleep(4);
          continue;
        }
      }

      // got an HTTP response.
      const statuscode = e.response.statusCode as number;

      // Expect this error response structure:
      // "response": {
      //   "statusCode": 404,
      //   "body": {
      //     "kind": "Status",
      //     "apiVersion": "v1",
      //     "metadata": {},
      //     "status": "Failure",
      //     "message": "configmaps \"opstrace-controller-config\" not found",
      //     "reason": "NotFound",
      //     "details": {
      //       "name": "opstrace-controller-config",
      //       "kind": "configmaps"
      //     },
      //     "code": 404
      //   },
      //...

      // handle 5xx responses, treat all of them as retryable.
      if (statuscode.toString().startsWith("5")) {
        log.debug("e.response: %s", JSON.stringify(e.response, null, 2));
        log.info(
          "retry config map creation/update soon as of 5xx response (%s)",
          e.message
        );
        await sleep(5);
        continue;
      }

      if (statuscode === 404) {
        // I think a 404 response means that either PATCH was called (for
        // updating the config map) w/o the config map existing in advance, or
        // also when PUT is called (for creating the config map) when e.g. the
        // namespace does not exist yet. I think in any case we do not want to
        // retry this.

        if (opts.forceUpdate) {
          log.warning("got 404 response, and forceUpdate is set");
        }

        // Re-throw error to let caller see the same 404 error detail.
        throw e;
      }

      if (statuscode === 409) {
        if (opts.forceCreate) {
          log.warning("config map already exists, but forceCreate is set");
          // Re-throw error to let caller see the same 409 error detail.
          throw e;
        }

        log.info(
          "409 response: config map already exists, try updating instead"
        );
        // This means we fall back from create to update:
        seen409 = true;
        continue;
      }

      // Fallback for errors we did not expect (throw, but also log detail).
      if (e.response) {
        log.warning("e.response: %s", JSON.stringify(e.response, null, 2));
      }
      throw e;
    }

    // Seen no error during either create or update: done, leave loop and func.
    return;
  }
}
