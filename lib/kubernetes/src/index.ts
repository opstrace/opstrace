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
export async function createOrUpdateCM(cm: ConfigMap): Promise<void> {
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
      if (seen409) {
        await update(cycle);
      } else {
        await create(cycle);
      }
    } catch (e) {
      if (e.response && e.response.statusCode === 409) {
        log.info(
          "409 response: config map already exists, try updating instead"
        );
        seen409 = true;
        continue;
      }

      // Handle transient/retryable errors here, mainly TCP connect() timeout
      // For context, see opstrace-prelaunch/issues/1039 and
      // https://github.com/kubernetes-client/javascript/issues/544
      if (e.code && e.code === "ETIMEDOUT") {
        log.info("retry config map creation/update soon (%s)", e.message);
        await sleep(3);
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
