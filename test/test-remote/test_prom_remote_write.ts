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

import got from "got";
import { ZonedDateTime, ZoneOffset } from "@js-joda/core";
import {
  log,
  sendMetricsWithPromContainer,
  logHTTPResponse,
  httpTimeoutSettings,
  rndstring,
  mtime,
  mtimeDeadlineInSeconds,
  sleep,
  globalTestSuiteSetupOnce,
  enrichHeadersWithAuthToken,
  TENANT_DEFAULT_CORTEX_API_BASE_URL,
  TENANT_DEFAULT_API_TOKEN_FILEPATH,
  CORTEX_API_TLS_VERIFY
} from "./testutils";

import { DummyTimeseries } from "./prom-node-client-tools";

async function queryCortex(baseUrl: string, queryUrlSuffix: string, queryParams: URLSearchParams) {
  /* Notes, in no particular order:

  - test deprecated /api/prom/query endpoint
    https://github.com/grafana/loki/blob/master/docs/api.md#get-apipromquery
    this resembles a query parameter set as constructed by the Grafana Explore
    UI.

  - Ideal would be: do not perform any kind of response body decoding within
    got's HTTP client implementation, do this explicitly after retrieving the
    response data as a byte sequence (into a Buffer), and then decode it
    explicitly first to text using e.g. response.body.toString("utf-8") and
    then as JSON doc. In the future use got 10 (currently 10.0.0-beta2, so a
    little early) because of the buffer goodness:
    https://github.com/sindresorhus/got/issues/949

  - Do not magically throw an error upon receiving a non-2xx response. Leave
    this to the test business logic.

  - Note that Loki seems to set `'Content-Type': 'text/plain; charset=utf-8'`
    even when it sends a JSON document in the response body. Submit a bug
    report, and at some point test that this is not the case anymore here.
  */
  const url = `${baseUrl}/api/v1/${queryUrlSuffix}`;

  // Automagically enrich with Authorization header, if applicable.
  const headers = enrichHeadersWithAuthToken(url, {});

  const options = {
    throwHttpErrors: false,
    searchParams: queryParams,
    timeout: httpTimeoutSettings,
    headers: headers,
    https: { rejectUnauthorized: CORTEX_API_TLS_VERIFY } // disable TLS server cert verification for now
  };

  const response = await got(url, options);
  if (response.statusCode != 200) logHTTPResponse(response);
  // Note: for now expect `response.body` to be text.
  return JSON.parse(response.body);
}

export interface MetricInstanaRecordLabels {
  [key: string]: string;
}

export interface MetricInstanaRecord {
  log: string;
  time: string;
  labels: MetricInstanaRecordLabels;
}

export async function waitForCortexQueryResult(
  baseUrl: string,
  queryParams: Record<string, string>,
  queryUrlSuffix: string,
  // What's our latency goal here? Upper pipeline latency limit? As of writing
  // this code I have seen this latency to vary between about 2 seconds and 12
  // seconds.
  maxWaitSeconds = 30,
  logQueryResponse = false
) {
  log.info(
    "Cortex query parameter (object):\n%s",
    JSON.stringify(queryParams, Object.keys(queryParams).sort(), 2)
  );
  const qparms = new URLSearchParams(queryParams);
  log.info("Cortex query parameters (query string):\n%s", qparms);

  const deadline = mtimeDeadlineInSeconds(maxWaitSeconds);
  log.info(
    "waiting for Cortex to return a match, deadline in %s s",
    maxWaitSeconds
  );

  //const t0 = mtime();

  while (true) {
    // `break`ing out the loop enters the error path, returning indicates
    // success.

    if (mtime() > deadline) {
      log.error("query deadline hit");
      break;
    }

    log.debug("send query to Cortex");
    const data = await queryCortex(baseUrl, queryUrlSuffix, qparms);
    if (logQueryResponse) {
      log.info("query response data:\n%s", JSON.stringify(data, null, 2));
    }

    const resultArray = data["data"]["result"];
    if (resultArray.length > 0) {
      return resultArray;
    }

    await sleep(1.0);
  }
  throw new Error(`Expectation not fulfilled within ${maxWaitSeconds} s`);
}

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

    const resultArray = await waitForCortexQueryResult(
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
      query: `${mname}{dummyseries="${uniquevalue}"}`,
      start: searchStart.toEpochSecond().toString(),
      end: searchEnd.toEpochSecond().toString(),
      step: "1"
    };

    const resultArray = await waitForCortexQueryResult(
      TENANT_DEFAULT_CORTEX_API_BASE_URL,
      queryParams,
      "query_range"
    );
    // this just confirms that the query response contains some data from
    // the time series that was just written. the data itself is not looked at.
    assert.strictEqual(resultArray[0]["metric"]["dummyseries"], uniquevalue);
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
