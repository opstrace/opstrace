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

// import env from "server/env";
import { log } from "@opstrace/utils/lib/log";
import { NextFunction, Request, Response } from "express";

import { KUBECONFIG } from "../../server";

// Expect a valid cortex runtime config document
// Context: https://cortexmetrics.io/docs/configuration/arguments/#runtime-configuration-file
export default function setCortexRuntimeConfigHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // a dummy for now

  log.info("setCortexRuntimeConfigHandler: got request body: %s", req.body);

  if (KUBECONFIG === undefined) {
    log.warning(
      "cannot process request: kubeconfig not set; graceful degradation"
    );
    res.status(500);
    return;
  }

  res.status(204);
  return;
}
