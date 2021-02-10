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

import { strict as assert } from "assert";
import crypto from "crypto";
import got from "got";

import {
  log,
  mtimeDeadlineInSeconds,
  mtimeDiffSeconds,
  mtime,
  sleep,
  logHTTPResponse,
  httpTimeoutSettings,
  LOKI_API_TLS_VERIFY,
  enrichHeadersWithAuthToken
} from "./index";

export interface LogRecordLabels {
  [key: string]: string;
}

export interface LogRecord {
  log: string;
  time: string;
  labels: LogRecordLabels;
}

export async function queryLoki(baseUrl: string, queryParams: URLSearchParams) {
  /* Notes, in no particular order:

  - test deprecated /api/prom/query endpoint
    https://github.com/grafana/loki/blob/master/docs/api.md#get-apipromquery
    this resembles a query parameter set as constructed by the Grafana Explore
    UI.

  - Ideal would be: do not perform any kind of response body decoding within
    got's HTTP client implementation, do this explicitly after retrieving the
    response data as a byte sequence (into a Buffer), and then decode it
    explicitly first to text using e.g. and then as JSON doc. Currently this
    gets in the way: https://github.com/sindresorhus/got/issues/1079

  - Do not magically throw an error upon receiving a non-2xx response. Leave
    this to the test business logic.

  - Note that Loki seems to set `'Content-Type': 'text/plain; charset=utf-8'`
    even when it sends a JSON document in the response body. Submit a bug
    report, and at some point test that this is not the case anymore here.
  */
  const url = `${baseUrl}/loki/api/v1/query_range`;

  const headers = enrichHeadersWithAuthToken(url, {});

  const options = {
    retry: 0,
    throwHttpErrors: false,
    searchParams: queryParams,
    timeout: httpTimeoutSettings,
    headers: headers,
    https: { rejectUnauthorized: LOKI_API_TLS_VERIFY } // https://github.com/sindresorhus/got/issues/1191
  };

  // Note(JP): I wanted to set
  // responseType: "buffer",
  // in the `options` object above and then use
  // `response.body.toString("utf-8")` below but
  // https://github.com/sindresorhus/got/issues/1079
  const response = await got(url, options);
  if (response.statusCode !== 200) logHTTPResponse(response);
  return JSON.parse(response.body);
}

export interface LokiQueryResult {
  entries: Array<[string, string]>;
  labels: LogRecordLabels;
  textmd5: string;
}

export async function waitForLokiQueryResult(
  lokiQuerierBaseUrl: string,
  queryParams: Record<string, string>,
  expectedEntryCount: number | undefined,
  logDetails = true,
  expectedStreamCount = 1,
  buildhash = true
): Promise<LokiQueryResult> {
  // What's our latency goal here? Upper pipeline latency limit? As of writing
  // this code I have seen this latency to vary between about 2 seconds and 12
  // seconds.
  const maxWaitSeconds = 30;

  const deadline = mtimeDeadlineInSeconds(maxWaitSeconds);
  if (logDetails) {
    log.info(
      `Enter Loki query loop, wait for expected result, deadline ${maxWaitSeconds} s.
Query parameters: ${JSON.stringify(
        queryParams,
        Object.keys(queryParams).sort(),
        2
      )}`
    );
  }

  const qparms = new URLSearchParams(queryParams);
  let queryCount = 0;
  const t0 = mtime();

  // `break`ing out the loop enters the error path, returning indicates
  // success.
  while (true) {
    if (mtime() > deadline) {
      log.error("query deadline hit");
      break;
    }

    queryCount += 1;
    if (queryCount % 15 === 0) {
      log.info("send query %s to loki", queryCount);
    }
    const result = await queryLoki(lokiQuerierBaseUrl, qparms);

    if (result.status === undefined) {
      log.warning(
        "no `status` property in response doc: %s",
        JSON.stringify(result)
      );
      await sleep(1);
      continue;
    }

    if (result.status !== "success") {
      log.warning(
        "status property is not `success`: %s",
        JSON.stringify(result.status)
      );
      await sleep(1);
      continue;
    }

    // Plan for the following structure.
    // {
    //   "status": "success",
    //   "data": {
    //     "resultType": "streams",
    //     "result": [
    //       {
    //         "stream": {
    //           "filename": "/var/log/myproject.log",
    //           "job": "varlogs",
    //           "level": "info"
    //         },
    //         "values": [
    //           [
    //             "1569266497240578000",
    //             "foo"
    //           ],
    //           [
    //             "1569266492548155000",
    //             "bar"
    //           ]
    //         ]
    //       }
    //     ],
    //     "stats": {
    //       ...
    //     }
    //   }
    // }

    const streams = result.data.result;

    if (streams.length === 0) {
      if (queryCount % 10 === 0) {
        log.info("queried %s times, no log entries seen yet", queryCount);
      }
      await sleep(0.5);
      continue;
    }

    if (logDetails)
      log.info(
        "query %s response data:\n%s",
        queryCount,
        JSON.stringify(result, null, 2)
      );

    // Note: 0 is a special case for "don't check the count!"
    // Conditionally check for number of expected label sets / "streams".
    if (expectedStreamCount !== 0) {
      assert.equal(streams.length, expectedStreamCount);
    }

    // Even if we got multiple streams here go with just one of them.
    assert("values" in streams[0]);

    const entrycount = streams[0]["values"].length;
    log.info(
      "expected nbr of query results: %s, got %s",
      expectedEntryCount,
      entrycount
    );

    // Expect N log entries in the stream.
    if (expectedEntryCount === undefined || entrycount === expectedEntryCount) {
      log.info(
        "got expected result in query %s after %s s",
        queryCount,
        mtimeDiffSeconds(t0).toFixed(2)
      );
      const labels: LogRecordLabels = streams[0].stream; //logqlKvPairTextToObj(data["streams"][0]["labels"]);
      //log.info("labels on returned log record:\n%s", labels);

      // Build a hash over all log message contents in this stream, in the
      // the order as returned by Loki. Can be used to verify that the same
      // payload data came out of the system as was put into it. Note: text
      // is encoded as utf-8 implicitly before hashing.
      let textmd5 = "disabled";
      if (buildhash) {
        const logTextHash = crypto.createHash("md5");
        for (const entry of streams[0]["values"]) {
          // entry[0] is the timestamp (ns precision integer as string)
          // entry[1] is the log line
          logTextHash.update(entry[1]);
        }
        textmd5 = logTextHash.digest("hex");
      }

      const result: LokiQueryResult = {
        //entries: data["streams"][0]["entries"],
        entries: streams[0]["values"],
        labels: labels,
        textmd5: textmd5
      };
      return result;
    }

    if (entrycount < expectedEntryCount) {
      log.info("not enough entries returned yet, waiting");
      await sleep(1);
      continue;
    } else throw new Error("too many entries returned in query result");
  }
  throw new Error(`Expectation not fulfilled within ${maxWaitSeconds} s`);
}
