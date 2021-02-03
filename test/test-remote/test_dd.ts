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
import { strict as assert } from "assert";

import { ZonedDateTime } from "@js-joda/core";
import got from "got";

import {
  log,
  rndstring,
  logHTTPResponse,
  httpTimeoutSettings,
  TENANT_DEFAULT_DD_API_BASE_URL,
  TENANT_DEFAULT_CORTEX_API_BASE_URL,
  TENANT_DEFAULT_API_TOKEN_FILEPATH,
  globalTestSuiteSetupOnce
} from "./testutils";

import { waitForCortexQueryResult } from "./test_prom_remote_write";

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
    const rndstr = rndstring(5);
    const metricname = `opstrace.dd.test-remote-${rndstr}`;
    const metricnameSanitized = `opstrace_dd_test_remote_${rndstr}`;

    const now = ZonedDateTime.now();
    const tsnow = now.toEpochSecond();

    const payload = {
      series: [
        {
          metric: metricname,
          // Note: these samples are descending in time, which is
          // the order that the DD agent sends fragments with. This order
          // is currently strictly required by the receiving end.
          points: [
            [tsnow, 2],
            [tsnow - 120, 1],
            [tsnow - 240, 0]
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

    // now query cortex
    const searchStart = now.minusMinutes(45);
    const searchEnd = now.plusMinutes(10);

    const queryParams = {
      query: `${metricnameSanitized}{job="ddagent"}`,
      start: searchStart.toEpochSecond().toString(),
      end: searchEnd.toEpochSecond().toString(),
      step: "60s"
    };

    const resultArray = await waitForCortexQueryResult(
      TENANT_DEFAULT_CORTEX_API_BASE_URL,
      queryParams
    );

    log.info("resultArray: %s", JSON.stringify(resultArray, null, 2));

    // Check that all three values in the original submit request are
    // covered by the query response.
    const valuesSeen = resultArray[0].values.map(
      (sample: Array<[number, string]>) => sample[1]
    );
    log.info("values seen: %s", valuesSeen);
    for (const v of ["0", "1", "2"]) {
      log.info("check for presence of value %s", v);
      assert(valuesSeen.includes(v));
    }

    // pragmatic criterion for starters: expect a number of values. with the
    // 1-second step size there should be tens or hundreds of values/samples.
    assert.strictEqual(resultArray[0]["values"].length > 5, true);
  });
});
