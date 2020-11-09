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
import got from "got";
import { performance } from "perf_hooks";

import {
  log,
  rndstring,
  timestampToNanoSinceEpoch,
  sendLogsWithFluentDContainer,
  logHTTPResponse,
  httpTimeoutSettings,
  mtimeDiffSeconds,
  mtime,
  testName,
  TENANT_DEFAULT_LOKI_API_BASE_URL,
  TENANT_DEFAULT_API_TOKEN_FILEPATH,
  LOKI_API_TLS_VERIFY,
  globalTestSuiteSetupOnce,
  enrichHeadersWithAuthToken,
  toRFC3339
} from "./testutils";

import {
  LogStreamEntry,
  LogStreamLabelset,
  LogStreamEntryTimestamp,
  LogStreamFragment,
  LogStreamFragmentPushRequest,
  DummyStream
} from "./loki-node-client-tools";

import { waitForLokiQueryResult } from "./testutils/logs";

export class LogStreamEntryTimestampGenerator {
  private currentSeconds: number;
  private currentNanos: number;

  constructor(starttime: ZonedDateTime) {
    this.currentSeconds = starttime.toEpochSecond();
    this.currentNanos = starttime.nano();
  }

  public incrementOneNs() {
    this.currentNanos += 1;
    if (this.currentNanos > 999999999) {
      this.currentNanos = 0;
      this.currentSeconds += 1;
    }

    const incrt: LogStreamEntryTimestamp = {
      seconds: this.currentSeconds,
      nanos: this.currentNanos
    };
    return incrt;
  }
}

function createDummyPushRequest(
  starttime: ZonedDateTime,
  labels: LogStreamLabelset,
  N_entries: number,
  samplegen: () => string
): LogStreamFragmentPushRequest {
  const tsGenerator = new LogStreamEntryTimestampGenerator(starttime);

  const fragment = new LogStreamFragment(labels);

  const t0 = mtime();
  for (let i = 1; i < N_entries + 1; i++) {
    fragment.addEntry(
      new LogStreamEntry(samplegen(), tsGenerator.incrementOneNs())
    );
  }

  log.info(
    "Constructed %s entries: %s s",
    N_entries,
    mtimeDiffSeconds(t0).toFixed(2)
  );

  const pushrequest = fragment.serialize();

  log.info("Constructed buffer: %s s", mtimeDiffSeconds(t0).toFixed(2));
  log.info("buf.length: %s", pushrequest.data.length);
  log.info(
    "buf byteLength: %s (%s MBytes)",
    Buffer.byteLength(pushrequest.data),
    (Buffer.byteLength(pushrequest.data) / (1024.0 * 1024.0)).toFixed(2)
  );

  return pushrequest;
}

async function postProtobufToLoki(lokiBaseUrl: string, body: Buffer) {
  /*

  The body Buffer is expected to be a protobuf message or a snappy-compressed
  protobuf message. Notably, the other end decodes a snappy-compressed protobuf
  message just fine without indicating a special Content-Type header value.

  */

  let headers: Record<string, string> = {
    "Content-Type": "application/x-protobuf"
  };
  const url = `${lokiBaseUrl}/loki/api/v1/push`;
  headers = enrichHeadersWithAuthToken(url, headers);

  const response = await got.post(url, {
    body: body,
    throwHttpErrors: false,
    headers: headers,
    timeout: httpTimeoutSettings,
    https: { rejectUnauthorized: LOKI_API_TLS_VERIFY }
  });
  logHTTPResponse(response);
  return response;
}

suite("Loki API test suite", function () {
  suiteSetup(async function () {
    log.info("suite setup");
    globalTestSuiteSetupOnce();
  });

  suiteTeardown(async function () {
    // Note: this does not seem to be run upon Node shutdown, e.g. triggered
    // with SIGINT. Make cleanup better.
    log.info("suite teardown");
  });

  test("insert w/ cntnrzd FluentD(loki plugin), then query", async function () {
    const now = toRFC3339(new Date());

    // Objects in this array are examples for what the Docker JSON file logging
    // writes. In particylar, the `log` key and the `time` key are what said
    // driver produces. Note that the exact same timestamp can be used across
    // log records in the same stream (Loki inserts them just fine).
    const logfileJsonDocs = [
      {
        log: "sample message 1with\nnewline loki output plugin",
        time: now
      },
      {
        log: "sample message 2with\nnewline loki output plugin",
        time: now
      }
    ];

    const idxfieldname = "indexfieldname";
    const idxfieldvalue = rndstring().slice(0, 5);

    await sendLogsWithFluentDContainer(
      TENANT_DEFAULT_LOKI_API_BASE_URL,
      TENANT_DEFAULT_API_TOKEN_FILEPATH,
      logfileJsonDocs,
      idxfieldname,
      idxfieldvalue,
      "fluent.out-loki.conf.template",
      "POST request was responded to with status code 204"
    );

    // Query for the log records that were just inserted.
    const ts = ZonedDateTime.parse(now);
    const searchStart = ts.minusHours(1);
    const searchEnd = ts.plusHours(1);
    const queryParams = {
      query: `{${idxfieldname}="${idxfieldvalue}"}`,
      direction: "BACKWARD",
      limit: "1000",
      start: timestampToNanoSinceEpoch(searchStart),
      end: timestampToNanoSinceEpoch(searchEnd)
    };

    // Wait for two entries in the single-stream query result.
    // TODO: inspect detail.
    await waitForLokiQueryResult(
      TENANT_DEFAULT_LOKI_API_BASE_URL,
      queryParams,
      2
    );
  });

  test("POST JSON to /loki/api/v1/push, then query", async function () {
    // @ts-ignore: TS2532: Object is possibly 'undefined'.
    const testname = testName(this);

    // `sampletsns` is for example: "1286705401123456789"
    const now = toRFC3339(new Date());
    const ts = ZonedDateTime.parse(now);
    const sampletsns = timestampToNanoSinceEpoch(ts);
    const samplemsg = "aaa\nwith newline";
    const searchcrit = rndstring().slice(0, 5);
    const samplelabels = {
      testname: testname,
      searchcrit: searchcrit
    };

    // Cf. https://github.com/grafana/loki/blob/v1.2.0/docs/api.md#post-lokiapiv1push
    const payload = {
      streams: [
        {
          stream: samplelabels,
          values: [[sampletsns, samplemsg]]
        }
      ]
    };

    log.info("POST body doc:\n%s", JSON.stringify(payload, null, 2));
    const payloadBytes = Buffer.from(JSON.stringify(payload), "utf-8");
    const url = `${TENANT_DEFAULT_LOKI_API_BASE_URL}/loki/api/v1/push`;
    const headers = {
      "Content-Type": "application/json"
    };
    const response = await got.post(url, {
      body: payloadBytes,
      throwHttpErrors: false,
      headers: enrichHeadersWithAuthToken(url, headers),
      timeout: httpTimeoutSettings,
      https: { rejectUnauthorized: LOKI_API_TLS_VERIFY } // https://github.com/sindresorhus/got/issues/1191
    });
    logHTTPResponse(response);
    assert.strictEqual(response.statusCode, 204);

    const searchStart = ts.minusHours(1);
    const searchEnd = ts.plusHours(1);
    const queryParams = {
      query: `{searchcrit="${searchcrit}"}`,
      direction: "BACKWARD",
      limit: "1000",
      start: timestampToNanoSinceEpoch(searchStart),
      end: timestampToNanoSinceEpoch(searchEnd)
    };

    const result = await waitForLokiQueryResult(
      TENANT_DEFAULT_LOKI_API_BASE_URL,
      queryParams,
      1,
      true
    );
    assert.strictEqual(result.entries[0][0], timestampToNanoSinceEpoch(ts));
    assert.strictEqual(result.entries[0][1], samplemsg);
    assert.deepStrictEqual(result.labels, samplelabels);
  });

  test("insert log records with equivalent timestamps", async function () {
    // @ts-ignore: TS2532: Object is possibly 'undefined'.
    const testname = testName(this);
    // https://nodejs.org/api/perf_hooks.html#perf_hooks_performance_timeorigin
    // get current time in nanoseconds from epoch
    const now = performance.timeOrigin + performance.now();

    const payload = {
      streams: [
        {
          stream: {
            testname: testname,
            uniq: rndstring().slice(0, 5)
          },
          values: [
            [now, "aaa"],
            [now, "aaa"]
          ]
        }
      ]
    };

    log.info("POST body doc:\n%s", JSON.stringify(payload, null, 2));
    const payloadBytes = Buffer.from(JSON.stringify(payload), "utf-8");
    const url = `${TENANT_DEFAULT_LOKI_API_BASE_URL}/loki/api/v1/push`;
    let headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    headers = enrichHeadersWithAuthToken(url, headers);
    const response = await got.post(url, {
      body: payloadBytes,
      throwHttpErrors: false,
      headers: headers,
      timeout: httpTimeoutSettings,
      https: { rejectUnauthorized: LOKI_API_TLS_VERIFY }
    });
    logHTTPResponse(response);
    assert.strictEqual(response.statusCode, 204);
  });

  test("POST protobuf to /loki/api/v1/push, then query", async function () {
    // @ts-ignore: TS2532: Object is possibly 'undefined'.
    const testname = testName(this);

    // Specify details of log record to be inserted.
    const now = toRFC3339(new Date());
    const timestamp = ZonedDateTime.parse(now);
    const samplemsg = "bbb\nwith newline";
    const searchcrit = rndstring().slice(0, 5);
    const samplelabels = {
      testname: testname,
      searchcrit: searchcrit
    };

    const logStreamFragment = new LogStreamFragment(samplelabels);
    logStreamFragment.addEntry(
      new LogStreamEntry(samplemsg, {
        seconds: timestamp.toEpochSecond(),
        nanos: timestamp.nano()
      })
    );
    const pushrequest = logStreamFragment.serialize();

    // Seemingly there is no need to set a header indicating that the body
    // is snappy-compressed. Also see:
    // https://github.com/grafana/loki/blob/8de2bc6b3d9a9e2d2f928d9717f1921feaddb27a/pkg/promtail/client/client.go#L29
    log.info("POST snappy-compressed protobuf msg with log record");
    const url = `${TENANT_DEFAULT_LOKI_API_BASE_URL}/loki/api/v1/push`;
    let headers: Record<string, string> = {
      "Content-Type": "application/x-protobuf"
    };
    headers = enrichHeadersWithAuthToken(url, headers);
    const response = await got.post(url, {
      body: pushrequest.data,
      throwHttpErrors: false,
      headers: headers,
      timeout: httpTimeoutSettings,
      https: { rejectUnauthorized: LOKI_API_TLS_VERIFY }
    });
    logHTTPResponse(response);
    assert.strictEqual(response.statusCode, 204);

    const searchStart = timestamp.minusHours(1);
    const searchEnd = timestamp.plusHours(1);
    const queryParams = {
      query: `{searchcrit="${searchcrit}"}`,
      direction: "BACKWARD",
      limit: "1000",
      start: timestampToNanoSinceEpoch(searchStart),
      end: timestampToNanoSinceEpoch(searchEnd)
    };

    const result = await waitForLokiQueryResult(
      TENANT_DEFAULT_LOKI_API_BASE_URL,
      queryParams,
      1,
      true
    );
    assert.strictEqual(
      result.entries[0][0],
      timestampToNanoSinceEpoch(timestamp)
    );
    assert.strictEqual(result.entries[0][1], samplemsg);
    assert.deepStrictEqual(result.labels, samplelabels);
  });

  test("log push load with pbuf, single stream fragment, query", async function () {
    //@ts-ignore: this has type any
    const testname = testName(this);
    function textgen(): string {
      return rndstring(90);
    }

    const searchcrit = rndstring(5);
    const starttime = ZonedDateTime.parse("2020-01-01T00:01:00.000000000Z");
    const pushrequest = createDummyPushRequest(
      starttime,
      {
        testname: testname,
        searchcrit: searchcrit
      },
      10 ** 3,
      textgen
    );
    await postProtobufToLoki(
      TENANT_DEFAULT_LOKI_API_BASE_URL,
      pushrequest.data
    );

    const queryParams = {
      query: `{searchcrit="${searchcrit}"}`,
      direction: "FORWARD",
      limit: "5000",
      start: timestampToNanoSinceEpoch(starttime.minusHours(1)),
      end: timestampToNanoSinceEpoch(starttime.plusHours(1))
    };

    const result = await waitForLokiQueryResult(
      TENANT_DEFAULT_LOKI_API_BASE_URL,
      queryParams,
      10 ** 3,
      false
    );

    // `expectedLogtexthash` has been built by iterating over the inserted log
    // entries in the order from older -> younger, and by updating a hash
    // object with the utf8-encoded text of each entry. For verification
    // obviously the iteration order through the entries returned in the query
    // result matters when building up the verification hash. With the
    // `FORWARD` direction specified in the query options the data is returned
    // with direction oldest -> youngest, too, and the same hashing method can
    // be applied (and is applied by the function generating LokiQueryResult)

    log.info("hash from %s entries: %s", result.entries.length, result.textmd5);
    assert.strictEqual(pushrequest.textmd5, result.textmd5);
  });

  test("log push load with pbuf, multi stream fragments", async function () {
    // @ts-ignore: TS2532: Object is possibly 'undefined'.
    const testname = testName(this);
    const starttime = ZonedDateTime.parse("2020-01-01T00:01:00.000000000Z");

    // N_streams determines the number of HTTP POST requests made. Each
    // insertion request has in its body a protobuf message containing a push
    // request, which contains a stream (fragment) which contains
    // `N_entries_per_stream_fragment` individual chronologically sorted log
    // entries (1 ns apart from each other). Each log entry has a randomly
    // generated text message with `N_chars_per_msg` characters.
    // Each stream fragment has a unique label set!
    const N_streams = 6;
    const N_entries_per_stream_fragment = 10 ** 4;
    const N_chars_per_msg = 60;

    // Generate one unique search criterion per stream.
    const searchcrits = Array.from(Array(N_streams), (v, i) => rndstring(6));

    // Generate a function that itself generates a dummy log entry message when
    // called.
    function textgen(): string {
      return rndstring(N_chars_per_msg);
    }

    // Create push request protobuf messages (each message contains one stream
    // fragment).
    const pushrequests = [];
    for (const searchcrit of searchcrits) {
      const pushrequest = createDummyPushRequest(
        starttime,
        {
          testname: testname,
          searchcrit: searchcrit
        },
        N_entries_per_stream_fragment,
        textgen
      );
      pushrequests.push(pushrequest);
    }

    // Concurrently submit HTTP requests with all push requests (one
    // HTTP request per push request).
    log.info("Concurrently start %s POST HTTP requests", pushrequests.length);
    const insertResponsePromises = [];
    const t0 = mtime();
    for (const pr of pushrequests) {
      insertResponsePromises.push(
        postProtobufToLoki(TENANT_DEFAULT_LOKI_API_BASE_URL, pr.data)
      );
    }
    // Wait for all HTTP requests to be responded to (or error out).
    log.info("Wait for all insertResponsePromises");
    await Promise.all(insertResponsePromises);

    const insertDurationSeconds = mtimeDiffSeconds(t0);
    log.info(
      "Inserted %s entries across %s push requests/streams: %s s",
      N_streams * N_entries_per_stream_fragment,
      N_streams,
      insertDurationSeconds.toFixed(2)
    );

    const charsSentTotal =
      N_streams * N_entries_per_stream_fragment * N_chars_per_msg;
    const charsPerSec = charsSentTotal / insertDurationSeconds;
    log.info("Characters per second: %s", charsPerSec.toFixed(2));
    log.info(
      "Char<->byte, log msg throughput: %s MBytes per second:",
      (charsPerSec / (1024 * 1024.0)).toFixed(2)
    );

    // For each stream fragment (and its unique search criterion), see if the
    // expected number of log entries is returned.
    log.info("Concurrently start %s queries", pushrequests.length);
    const queryResponsePromises = [];
    for (const searchcrit of searchcrits) {
      const queryParams = {
        query: `{searchcrit="${searchcrit}"}`,
        direction: "FORWARD",
        limit: "5000",
        start: timestampToNanoSinceEpoch(starttime.minusHours(1)),
        end: timestampToNanoSinceEpoch(starttime.plusHours(1))
      };
      queryResponsePromises.push(
        waitForLokiQueryResult(
          TENANT_DEFAULT_LOKI_API_BASE_URL,
          queryParams,
          N_entries_per_stream_fragment,
          false
        )
      );
    }

    log.info("Wait for all queryResponsePromises");
    const results = await Promise.all(queryResponsePromises);
    const expectedLogtextmd5s = Array.from(pushrequests, (v, i) => v.textmd5);

    assert.strictEqual(results.length, expectedLogtextmd5s.length);
    for (const result of results) {
      assert.strictEqual(expectedLogtextmd5s.includes(result.textmd5), true);
      log.info("found hash in expected hashes: %s", result.textmd5);
    }
  });

  test("short dummystream insert, validate via query", async function () {
    const stream = new DummyStream({
      n_entries_per_stream_fragment: 10 ** 2,
      n_chars_per_message: 90,
      starttime: ZonedDateTime.now(),
      //starttime: ZonedDateTime.parse("2020-02-20T17:40:40.000000000Z"),
      uniqueName: `test-remote-${rndstring(5)}`,
      timediffNanoseconds: 1,
      includeTimeInMsg: true,
      labelset: undefined,
      compressability: "min"
    });
    log.info("Dummy stream: %s", stream);

    const lurl = TENANT_DEFAULT_LOKI_API_BASE_URL;

    await stream.postFragmentsToLoki(
      2,
      lurl,
      enrichHeadersWithAuthToken(lurl, {})
    );
    const vt0 = mtime();

    await stream.fetchAndValidate({ querierBaseUrl: lurl });
    log.info("validation took %s s overall", mtimeDiffSeconds(vt0).toFixed(1));
  });

  test("long dummystream insert, validate via query", async function () {
    const N_concurrent_streams = 5;
    const nameprefix = `test-remote-ldi-${rndstring(6)}`;

    const streams = [];
    for (let i = 1; i < N_concurrent_streams + 1; i++) {
      const streamname = `${nameprefix}-${i.toString().padStart(4, "0")}`;

      const stream = new DummyStream({
        n_entries_per_stream_fragment: 10 ** 4,
        n_chars_per_message: 90,
        starttime: ZonedDateTime.now(),
        uniqueName: streamname,
        timediffNanoseconds: 100,
        includeTimeInMsg: true,
        labelset: undefined,
        compressability: "min"
      });
      log.info("Initialized dummystream: %s", stream);
      log.info(
        "Time of first entry in stream: %s",
        stream.currentTimeRFC3339Nano()
      );
      streams.push(stream);
    }

    const nFragmentsPerStream = 20;

    const t0 = mtime();

    const pushers = [];
    for (const stream of streams) {
      pushers.push(
        stream.postFragmentsToLoki(
          nFragmentsPerStream,
          TENANT_DEFAULT_LOKI_API_BASE_URL,
          enrichHeadersWithAuthToken(TENANT_DEFAULT_LOKI_API_BASE_URL, {})
        )
      );
    }
    await Promise.all(pushers);

    // A little summary about pushing all data.
    const durationSeconds = mtimeDiffSeconds(t0);
    const NentriesSent =
      N_concurrent_streams *
      nFragmentsPerStream *
      streams[0].n_entries_per_stream_fragment;
    const NcharsSent = NentriesSent * streams[0].n_chars_per_message;
    const MegacharsSent = NcharsSent / 10 ** 6; // int division ok?
    const MegacharsPerSec = MegacharsSent / durationSeconds;
    log.info(
      "Entries sent: %s, Chars sent: %s million",
      NentriesSent,
      MegacharsSent.toFixed(2)
    );
    log.info(
      "Log msg throughput (mean): %s million characters per second",
      MegacharsPerSec.toFixed(2)
    );

    // todo: do this concurrently once confidence is there.
    const validators = [];
    for (const stream of streams) {
      validators.push(
        stream.fetchAndValidate({
          querierBaseUrl: TENANT_DEFAULT_LOKI_API_BASE_URL
        })
      );
    }
    await Promise.all(validators);
  });
});
