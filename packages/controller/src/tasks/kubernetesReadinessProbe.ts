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

import { createLightship } from "lightship";
import { log } from "@opstrace/utils";

// Setup Kubernetes a very simple readiness probe using
// https://github.com/gajus/lightship. When the controller is ready it should
// call setToReady.
const lightship = createLightship({
  signals: ["SIGINT", "SIGTERM"],
  port: 9000
});

lightship.registerShutdownHandler(async () => {
  log.debug("shutting down gracefully");
});

export function setToReady() {
  // Lightship default state is "SERVER_IS_NOT_READY". Therefore, you must signal
  // that the server is now ready to accept connections.
  log.debug("controller is ready");
  lightship.signalReady();
}
