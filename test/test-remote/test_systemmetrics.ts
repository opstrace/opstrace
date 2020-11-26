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

import { strict as assert } from "assert";
import { ZonedDateTime } from "@js-joda/core";
import {
  log,
  globalTestSuiteSetupOnce,
  TENANT_SYSTEM_CORTEX_API_BASE_URL
} from "./testutils";

import { waitForCortexQueryResult } from "./test_prom_remote_write";

suite("system metrics test suite", function () {
  suiteSetup(async function () {
    log.info("suite setup");
    globalTestSuiteSetupOnce();
  });

  suiteTeardown(async function () {
    log.info("suite teardown");
  });

  test("check if container metrics exist", async function () {
    const ts = ZonedDateTime.now();
    const searchStart = ts.minusHours(1);
    const searchEnd = ts.plusHours(1);
    // See opstrace-prelaunch/issues/1866 for a little
    // bit of context -- this is not just an arbitrary query :-).
    const queryParams = {
      query:
        'process_cpu_seconds_total{container="ingester", namespace="cortex"}',
      start: searchStart.toEpochSecond().toString(),
      end: searchEnd.toEpochSecond().toString(),
      step: "1"
    };

    const resultArray = await waitForCortexQueryResult(
      TENANT_SYSTEM_CORTEX_API_BASE_URL,
      queryParams
    );

    // pragmatic criterion for starters: expect a number of values. with
    // the 1-second step size there should be hundreds of values/samples
    // by now.
    assert.strictEqual(resultArray[0]["values"].length > 5, true);
  });
});
