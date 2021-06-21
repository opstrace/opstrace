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

import { ZonedDateTime, ZoneOffset } from "@js-joda/core";
import {
  enrichHeadersWithAuthToken,
  globalTestSuiteSetupOnce,
  log,
  rndstring,
  sendMetricsWithPromContainer,
  TENANT_DEFAULT_API_TOKEN_FILEPATH,
  TENANT_DEFAULT_CORTEX_API_BASE_URL
} from "./testutils";

import { waitForCortexMetricResult } from "./testutils/metrics";

import { DummyTimeseries } from "./looker/metrics";

suite("Prometheus remote_write (push to opstrace cluster) tests", function () {
  suiteSetup(async function () {
    log.info("suite setup");
    globalTestSuiteSetupOnce();
  });

  suiteTeardown(async function () {
    log.info("suite teardown");
  });

  test("local Prom remote_writes metrics with unique label", async function () {
    // The containerized Prometheus `remote_write`s all metrics into the
    // opstrace cluster with the `job` label set to this value.
    const uniqueScrapeJobName = rndstring().slice(0, 5);
    await sendMetricsWithPromContainer(
      `${TENANT_DEFAULT_CORTEX_API_BASE_URL}/api/v1/push`,
      uniqueScrapeJobName,
      TENANT_DEFAULT_API_TOKEN_FILEPATH
    );

    const ts = ZonedDateTime.now();
    const searchStart = ts.minusHours(1);
    const searchEnd = ts.plusHours(1);
    const queryParams = {
      query: `process_start_time_seconds{job="${uniqueScrapeJobName}"}`,
      start: searchStart.toEpochSecond().toString(),
      end: searchEnd.toEpochSecond().toString(),
      step: "1"
    };

    const resultArray = await waitForCortexMetricResult(
      TENANT_DEFAULT_CORTEX_API_BASE_URL,
      queryParams,
      "query_range"
    );

    // confirm that this was sent by the containerized prom (the "pusher
    // prom"), using the label kv pair only known to the pusher prom.
    assert.strictEqual(resultArray[0]["metric"]["job"], uniqueScrapeJobName);

    // `process_start_time_seconds` is a gauge, expected to be set once. it
    // indicates the start time of the pusher prometheus. get first gauge
    // value, confirm that it is within +/- 100 second of this test's
    // approximate invocation time (`ts` above).
    const starttimestamp: number = resultArray[0]["values"][0][1];
    log.info("push prometheus start time: %s", starttimestamp);
    assert.strictEqual(ts.toEpochSecond() + 100 > starttimestamp, true);
    assert.strictEqual(starttimestamp > ts.toEpochSecond() - 100, true);
  });

  test("dummyseries short write, smoke read", async function () {
    const now = ZonedDateTime.now().withNano(0);
    const uniquevalue = `test-remote-${rndstring(5)}`;
    const mname = `test_metric_${rndstring(4)}`;

    const series = new DummyTimeseries({
      metricName: mname,
      n_samples_per_series_fragment: 50,
      starttime: now,
      //starttime: ZonedDateTime.parse("2020-02-20T17:40:40.000000000Z"),
      uniqueName: uniquevalue,
      timediffMilliSeconds: 1000,
      labelset: undefined
    });
    log.info("Dummy timeseries: %s", series);
    const burl = TENANT_DEFAULT_CORTEX_API_BASE_URL;
    await series.postFragmentsToCortex(
      3,
      burl,
      enrichHeadersWithAuthToken(burl, {})
    );

    const searchStart = now.minusMinutes(5);
    const searchEnd = now.plusMinutes(5);
    const queryParams = {
      query: `${mname}{uniquename="${uniquevalue}"}`,
      start: searchStart.toEpochSecond().toString(),
      end: searchEnd.toEpochSecond().toString(),
      step: "1"
    };

    const resultArray = await waitForCortexMetricResult(
      TENANT_DEFAULT_CORTEX_API_BASE_URL,
      queryParams,
      "query_range"
    );
    // this just confirms that the query response contains some data from
    // the time series that was just written. the data itself is not looked at.
    assert.strictEqual(resultArray[0]["metric"]["uniquename"], uniquevalue);
  });

  test("dummyseries short write, fetchAndValidate", async function () {
    const now = ZonedDateTime.now(ZoneOffset.UTC).withNano(0);
    const uniquevalue = `test-remote-${rndstring(5)}`;
    const series = new DummyTimeseries({
      metricName: `test_metric_${rndstring(4)}`,
      n_samples_per_series_fragment: 50,
      starttime: now.minusMinutes(30),
      //starttime: now,
      //starttime: ZonedDateTime.parse("2020-02-20T17:40:40.000000000Z"),
      uniqueName: uniquevalue,
      timediffMilliSeconds: 1000,
      labelset: undefined
    });
    log.info("Dummy timeseries: %s", series);
    const burl = TENANT_DEFAULT_CORTEX_API_BASE_URL;
    const additionalHeaders = enrichHeadersWithAuthToken(burl, {});
    await series.postFragmentsToCortex(3, burl, additionalHeaders);
    await series.fetchAndValidate({
      querierBaseUrl: burl,
      additionalHeaders: additionalHeaders
    });
  });

  test("dummyseries long write 1, fetchAndValidate", async function () {
    // remove fractional part.
    const now = ZonedDateTime.now(ZoneOffset.UTC).withNano(0);

    const uniquevalue = `test-remote-${rndstring(5)}`;
    const series = new DummyTimeseries({
      metricName: `test_metric_${rndstring(4)}`,
      n_samples_per_series_fragment: 10000,
      starttime: now.minusMinutes(45), // api does not accept samples from future
      //starttime: ZonedDateTime.parse("2020-02-20T17:40:40.000000000Z"),
      uniqueName: uniquevalue,
      timediffMilliSeconds: 1,
      labelset: undefined
    });
    log.info("Dummy timeseries: %s", series);
    const burl = TENANT_DEFAULT_CORTEX_API_BASE_URL;
    const headers = enrichHeadersWithAuthToken(burl, {});
    await series.postFragmentsToCortex(5, burl, headers);
    await series.fetchAndValidate({
      querierBaseUrl: burl,
      additionalHeaders: headers
    });
  });

  test("dummyseries long write 2, fetchAndValidate", async function () {
    // remove fractional part.
    const now = ZonedDateTime.now(ZoneOffset.UTC).withNano(0);

    const uniquevalue = `test-remote-${rndstring(5)}`;
    const series = new DummyTimeseries({
      metricName: `test_metric_${rndstring(4)}`,
      n_samples_per_series_fragment: 25000,
      starttime: now.minusMinutes(50), // api does not accept samples from future
      //starttime: ZonedDateTime.parse("2020-02-20T17:40:40.000000000Z"),
      uniqueName: uniquevalue,
      timediffMilliSeconds: 1,
      labelset: undefined
    });
    log.info("Dummy timeseries: %s", series);
    const burl = TENANT_DEFAULT_CORTEX_API_BASE_URL;
    const additionalHeaders = enrichHeadersWithAuthToken(burl, {});
    await series.postFragmentsToCortex(20, burl, additionalHeaders);
    await series.fetchAndValidate({
      querierBaseUrl: burl,
      additionalHeaders: additionalHeaders
    });
  });
});
