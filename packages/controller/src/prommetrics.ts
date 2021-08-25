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

import express from "express";
import * as promclient from "prom-client";

import { log } from "@opstrace/utils";

export function setupPromExporter(port: number) {
  // Collect process_* and nodejs_* metrics, see list here:
  // https://github.com/siimon/prom-client/blob/4e6aacd/lib/defaultMetrics.js
  promclient.collectDefaultMetrics();

  const httpapp = express();

  httpapp.get(
    "/metrics",
    async function (req: express.Request, res: express.Response) {
      log.debug("handling request to /metrics");
      res.set('Content-Type', promclient.register.contentType);
      const metrics = await promclient.register.metrics();
      res.send(metrics);
    }
  );

  httpapp.listen(port, () =>
    log.info("metrics server listening on port %s", port)
  );
}
