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

import { strict as assert } from "assert";
import querystring from "querystring";

import WebSocket from "ws";

import {
  log,
  TENANT_SYSTEM_API_TOKEN_FILEPATH,
  OPSTRACE_INSTANCE_DNS_NAME,
  LOKI_API_TLS_VERIFY,
  globalTestSuiteSetupOnce,
  enrichHeadersWithAuthTokenFile
} from "./testutils";

suite("Loki tail API test suite", function () {
  suiteSetup(async function () {
    log.info("suite setup");
    globalTestSuiteSetupOnce();
  });

  suiteTeardown(async function () {
    // Note: this does not seem to be run upon Node shutdown, e.g. triggered
    // with SIGINT. Make cleanup better.
    log.info("suite teardown");
  });

  test.skip("connect and stream cortex ingester pod logs from /loki/api/v1/tail", async function () {
    // encode query string
    const query = querystring.stringify({
      query: `{k8s_namespace_name="cortex",k8s_container_name="ingester"}`
    });
    // build url with query param
    const url = `wss://loki.system.${OPSTRACE_INSTANCE_DNS_NAME}/loki/api/v1/tail?${query}`;

    log.info(`Connecting to websocket url: ${url}`);

    const headers = {};
    const ws = new WebSocket(url, {
      rejectUnauthorized: LOKI_API_TLS_VERIFY,
      headers: enrichHeadersWithAuthTokenFile(
        TENANT_SYSTEM_API_TOKEN_FILEPATH,
        headers
      )
    });

    const timeout = new Promise(resolve =>
      setTimeout(() => resolve("timeout"), 30000)
    );

    const test = new Promise((resolve, reject) => {
      ws.on("connection", () => {
        log.info("connected via websocket");
      });
      ws.on("message", msg => {
        log.info(`got a message over websocket: ${msg.slice(0, 180)}`);
        resolve("test");
      });
      ws.on("close", () => reject("websocket closed"));
    });

    log.info(`waiting 30s for a websocket message...`);
    const result = await Promise.race([timeout, test]);
    assert.strictEqual(result, "test");
    ws.close();
  });
});
