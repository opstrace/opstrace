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

import fs from "fs";
//import { strict as assert } from "assert";

import { ZonedDateTime } from "@js-joda/core";
import got from "got";

import {
  log,
  rndstring,
  logHTTPResponse,
  httpTimeoutSettings,
  TENANT_DEFAULT_DD_API_BASE_URL,
  TENANT_DEFAULT_API_TOKEN_FILEPATH,
  globalTestSuiteSetupOnce
} from "./testutils";

// async function postToDDAPI(lokiBaseUrl: string, body: Buffer) {
//   /*

//     The body Buffer is expected to be a protobuf message or a snappy-compressed
//     protobuf message. Notably, the other end decodes a snappy-compressed protobuf
//     message just fine without indicating a special Content-Type header value.

//     */

//   let headers: Record<string, string> = {
//     "Content-Type": "application/x-protobuf"
//   };
//   const url = `${lokiBaseUrl}/loki/api/v1/push`;
//   headers = enrichHeadersWithAuthToken(url, headers);

//   const response = await got.post(url, {
//     body: body,
//     throwHttpErrors: false,
//     headers: headers,
//     timeout: httpTimeoutSettings,
//     https: { rejectUnauthorized: LOKI_API_TLS_VERIFY }
//   });
//   logHTTPResponse(response);
//   return response;
// }

function ddApiSeriesUrl() {
  let url = `${TENANT_DEFAULT_DD_API_BASE_URL}/api/v1/series`;
  if (TENANT_DEFAULT_API_TOKEN_FILEPATH !== undefined) {
    const token = fs.readFileSync(TENANT_DEFAULT_API_TOKEN_FILEPATH, {
      encoding: "utf8"
    });
    url = `${url}?api_key=${token}`;
  }
  return url;
}

suite("DD API test suite", function () {
  suiteSetup(async function () {
    log.info("suite setup");
    globalTestSuiteSetupOnce();
  });

  suiteTeardown(async function () {
    // Note: this does not seem to be run upon Node shutdown, e.g. triggered
    // with SIGINT. Make cleanup better.
    log.info("suite teardown");
  });

  test("dd_api_insert_single_ts_fragment", async function () {
    const metricname = `opstrace.dd.test-remote-${rndstring(5)}`;

    const now = ZonedDateTime.now();
    const tsnow = now.toEpochSecond();

    const payload = {
      series: [
        {
          metric: metricname,
          points: [
            [tsnow, 1],
            [tsnow - 10, 0]
          ],
          tags: ["version:7.24.1", "testtag:testvalue"],
          host: "somehost",
          type: "rate",
          interval: 5
        }
      ]
    };

    log.info("POST body doc:\n%s", JSON.stringify(payload, null, 2));
    const payloadBytes = Buffer.from(JSON.stringify(payload), "utf-8");

    const headers = {
      "Content-Type": "application/json"
    };
    const response = await got.post(ddApiSeriesUrl(), {
      body: payloadBytes,
      throwHttpErrors: false,
      headers: headers,
      timeout: httpTimeoutSettings,
      https: { rejectUnauthorized: false }
    });
    logHTTPResponse(response);
  });
});
