/**
 * Copyright 2019-2021 Opstrace, Inc.
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

import { ZonedDateTime } from "@js-joda/core";

import {
  log,
  timestampToNanoSinceEpoch,
  globalTestSuiteSetupOnce,
  TENANT_SYSTEM_LOKI_API_BASE_URL
} from "./testutils";

import { waitForLokiQueryResult } from "./testutils/logs";

suite("system logs test suite", function () {
  suiteSetup(async function () {
    log.info("suite setup");
    globalTestSuiteSetupOnce();
  });

  suiteTeardown(async function () {
    log.info("suite teardown");
  });

  async function query(expr: string) {
    const ts = ZonedDateTime.now();
    // Allow for testing clusters that started a couple of days ago
    const searchStart = ts.minusHours(100);
    const searchEnd = ts.plusHours(1);
    const queryParams = {
      query: expr,
      direction: "BACKWARD",
      regexp: "",
      limit: "10",
      start: timestampToNanoSinceEpoch(searchStart),
      end: timestampToNanoSinceEpoch(searchEnd)
    };

    const result = await waitForLokiQueryResult(
      TENANT_SYSTEM_LOKI_API_BASE_URL,
      queryParams,
      undefined,
      false,
      0
    );

    if (result.entries == undefined || result.entries.length == 0) {
      throw new Error(`Expected query ${query} to return some entries`);
    }
  }

  test("check loki ingester logs", async function () {
    await query(
      '{k8s_namespace_name="loki", k8s_container_name="ingester"} |= "Starting Loki"'
    );
  });

  test("check cortex distributor logs", async function () {
    await query(
      '{k8s_namespace_name="cortex", k8s_pod_name=~"distributor-.+"} |= "Starting Cortex"'
    );
  });

  test("check systemlog Fluentd instance logs", async function () {
    await query(
      '{k8s_namespace_name="system-tenant", k8s_pod_name=~"systemlog.*"} |= "following tail of"'
    );
  });
});
