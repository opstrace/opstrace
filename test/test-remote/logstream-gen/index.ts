#!/usr/bin/env node
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
import os from "os";

import { ZonedDateTime, ZoneOffset } from "@js-joda/core";
import argparse from "argparse";

import got, { Response as GotResponse } from "got";

import { Semaphore } from "await-semaphore";

import * as promclient from "prom-client";
import express from "express";

import { createHttpTerminator } from "http-terminator";

import {
  DummyStream,
  LogStreamFragmentPushRequest,
  LogStreamLabelset,
  DummyStreamFetchAndValidateOpts
} from "../loki-node-client-tools";

import {
  DummyTimeseries,
  TimeseriesFragment,
  TimeseriesFragmentPushMessage,
  DummyTimeseriesFetchAndValidateOpts
} from "../prom-node-client-tools";

import { LokiQueryResult } from "../testutils/logs";

import {
  rndstring,
  sleep,
  mtimeDiffSeconds,
  mtimeDeadlineInSeconds,
  mtime,
  timestampToRFC3339Nano,
  httpTimeoutSettings
} from "../testutils";

import { log, buildLogger, setLogger } from "./log";

interface CfgInterface {
  n_concurrent_streams: number;
  n_chars_per_msg: number;
  n_entries_per_stream_fragment: number;
  n_cycles: number;
  stream_write_n_fragments: number;
  stream_write_n_seconds: number;
  max_concurrent_writes: number;
  max_concurrent_reads: number;
  logLevel: string;
  apibaseurl: string;
  invocation_id: string;
  log_start_time: string;
  log_time_increment_ns: number;
  http_server_port: number;
  additional_labels: Array<[string, string]> | undefined;
  compressability: string;
  change_streams_every_n_cycles: number;
  stream_write_n_seconds_jitter: number;
  fetch_n_entries_per_query: number;
  metrics_mode: boolean;
  metrics_time_increment_ms: number;
  bearer_token_file: string;
  retry_post_deadline_seconds: number;
  retry_post_min_delay_seconds: number;
  retry_post_max_delay_seconds: number;
  retry_post_jitter: number;
}

let CFG: CfgInterface;

interface WriteStats {
  nEntriesSent: number;
  nPayloadBytesSent: number;
  entriesSentPerSec: number;
  megaPayloadBytesSentPerSec: number;
  durationSeconds: number;
}

interface ReadStats {
  nEntriesRead: number;
  nPayloadBytesRead: number;
  entriesReadPerSec: number;
  megaPayloadBytesReadPerSec: number;
  durationSeconds: number;
}

const DEFAULT_LOG_LEVEL_STDERR = "info";

// let STATS_WRITE: WriteStats;
// let STATS_READ: ReadStats;

const START_TIME_JODA = ZonedDateTime.now(ZoneOffset.UTC);
const START_TIME_EPOCH = START_TIME_JODA.toEpochSecond();
const START_TIME_MONOTONIC = mtime();

// these are set dynamically per-cycle.
let CYCLE_START_TIME_MONOTONIC: bigint;
let CYCLE_STOP_WRITE_AFTER_SECONDS: number;

// I didn't find a sane way to get the current value of a prometheus counter
// so this duplicates this as a global for internal things. Does not wrap,
// of course.
let COUNTER_STREAM_FRAGMENTS_PUSHED = BigInt(0);

let COUNTER_HTTP_RESP_LOG_THROTTLE = 0;
let COUNTER_FRAGMENT_STATS_LOG_THROTTLE = 0;

let BEARER_TOKEN: undefined | string;

const counter_fragments_pushed = new promclient.Counter({
  name: "counter_fragments_pushed",
  help: "number of log stream fragments successfully pushed"
});

const counter_serialized_fragments_bytes_pushed = new promclient.Counter({
  name: "counter_serialized_fragments_bytes_pushed",
  help:
    "cumulative size of snappy-compressed protobuf messages (serialized log stream fragments) successfully POSTed to Loki API"
  // note that this should be the ~amount of data written into HTTP request
  // bodies over the wire -- however, it's unclear if maybe some additional
  // gzip compression happens on top of this
});

const counter_log_entries_pushed = new promclient.Counter({
  name: "counter_log_entries_pushed",
  help: "number of log entries successfully pushed"
});

const counter_payload_bytes_pushed = new promclient.Counter({
  name: "counter_payload_bytes_pushed",
  help:
    "byte length of all pushed log messages / metric samples so far " +
    "(assumes utf-8 encoding for logs and 8 byte per sample for metrics)"
});

const counter_post_responses = new promclient.Counter({
  name: "counter_post_responses",
  help: "HTTP responses to POST requests by status code",
  labelNames: ["statuscode"]
});

const counter_post_non_http_errors = new promclient.Counter({
  name: "counter_post_non_http_errors",
  help: "connection errors and the likes, must refer to logs for detail"
});

const counter_get_responses = new promclient.Counter({
  name: "counter_get_responses",
  help: "HTTP responses to GET requests by status code",
  labelNames: ["statuscode"]
});

const counter_unexpected_query_results = new promclient.Counter({
  name: "counter_unexpected_query_results",
  help:
    "Error counter for unexpected Loki query results (such as unexpected log entry count in query result)",
  labelNames: ["statuscode"]
});

const counter_get_non_http_errors = new promclient.Counter({
  name: "counter_get_non_http_errors",
  help: "connection errors and the likes, must refer to logs for detail"
});

const counter_rw_cycles = new promclient.Counter({
  name: "counter_rw_cycles",
  help: "number of read/write cycles performed"
});

const gauge_last_http_request_body_size_bytes = new promclient.Gauge({
  name: "gauge_last_http_request_body_size_bytes",
  help:
    "size of last successfully POSTed HTTP request body (snappy-compressed protobuf message: a serialized log stream fragments)"
});

const hist_duration_post_with_retry_seconds = new promclient.Histogram({
  name: "duration_post_with_retry_seconds",
  help: "Duration between entering postWithRetry and leaving it with success",
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 20, 30, 60, 120]
});

const gauge_uptime = new promclient.Gauge({
  name: "gauge_uptime",
  help: "uptime of current looker process in seconds"
});

function parseCmdlineArgs() {
  const parser = new argparse.ArgumentParser({
    description: "Looker test runner"
  });

  parser.add_argument("apibaseurl", {
    help: "Loki API base URL (Cortex API base URL in metrics mode)",
    type: "str"
  });

  parser.add_argument("--log-level", {
    help: `Set log level for output on stderr. One of: debug, info, warning, error. Default: ${DEFAULT_LOG_LEVEL_STDERR}`,
    type: "str",
    choices: ["debug", "info", "warning", "error"],
    default: DEFAULT_LOG_LEVEL_STDERR,
    metavar: "LEVEL",
    dest: "logLevel"
  });

  parser.add_argument("--metrics-mode", {
    help:
      "metrics mode (Cortex) instead of logs mode (Loki) -- metrics mode was added later in quick and dirty fashion",
    action: "store_true",
    default: false
  });

  // note: maybe rename to --n-streams, because concurrency is controlled
  // differently
  parser.add_argument("--n-concurrent-streams", {
    help:
      "number of log streams to create per write/read cycle (or number of metric streams)",
    type: "int",
    required: true
  });

  parser.add_argument("--n-entries-per-stream-fragment", {
    help:
      "number of log entries per log stream fragment (or number of metric samples per fragment)",
    type: "int",
    required: true
  });

  parser.add_argument("--n-chars-per-msg", {
    help: "number of characters per log message (ignored in metrics mode)",
    type: "int",
    default: 100
  });

  // note: looking for a more expressive name
  parser.add_argument("--log-start-time", {
    help:
      "Timestamp of first log entry in all generated log streams. ISO 8601 / RFC3339Nano (tz-aware), example: 2020-02-20T17:46:37.27000000Z. Default: invocation time",
    type: "str"
  });

  parser.add_argument("--log-time-increment-ns", {
    help:
      "time difference in nanonseconds between adjacent log entries in a " +
      "log stream (between log entry timestamps) (ignored in metrics mode)",
    type: "int",
    default: 1
  });

  parser.add_argument("--metrics-time-increment-ms", {
    help:
      "time difference in milliseconds between adjacent samples in a time series",
    type: "int",
    default: 1
  });

  parser.add_argument("--max-concurrent-writes", {
    help:
      "Maximum number of POST HTTP requests to perform concurrently. Default: 0 (do as many as given by --n-concurrent-streams).",
    type: "int",
    default: 0
  });

  parser.add_argument("--max-concurrent-reads", {
    help:
      "Maximum number of GET HTTP requests to perform concurrently during the read/validation phase. Default: 0 (do as many as given by --n-concurrent-streams).",
    type: "int",
    default: 0
  });

  parser.add_argument("--compressability", {
    help:
      "compressability characteristic of generated log messages (ignored in metrics mode)",
    type: "str",
    choices: ["min", "max", "medium"],
    default: "min"
  });

  parser.add_argument("--n-cycles", {
    help:
      "number of write/read cycles to perform. Every cycle generates a report.",
    type: "int",
    default: 1
  });

  parser.add_argument("--change-streams-every-n-cycles", {
    help:
      "Use the same log stream for N cycles, then create a new set of " +
      "log streams (with unique label sets)",
    type: "int",
    default: 1
  });

  parser.add_argument("--label", {
    help: "add a label key/value pair to all emitted log entries",
    metavar: ["KEY", "VALUE"],
    nargs: 2,
    action: "append",
    dest: "additional_labels"
  });

  parser.add_argument("--http-server-port", {
    help: "HTTP server listen port (serves /metrics Prometheus endpoint)",
    type: "int",
    default: 8900
  });

  const stopgroup = parser.add_mutually_exclusive_group({ required: true });
  stopgroup.add_argument("--stream-write-n-fragments", {
    help:
      "within a write/read cycle, stop write (and enter read phase) when " +
      "this many fragments were written for a log stream",
    type: "int",
    default: 0
  });

  stopgroup.add_argument("--stream-write-n-seconds", {
    help:
      "within a write/read cycle, stop write (and enter read phase) after " +
      "having written for approx. that many seconds",
    type: "int",
    default: 0
  });

  parser.add_argument("--stream-write-n-seconds-jitter", {
    help:
      "add random number of seconds from interval [-J,J] to --stream-write-n-seconds ",
    metavar: "J",
    type: "float",
    default: 0
  });

  parser.add_argument("--fetch-n-entries-per-query", {
    help:
      "Maximum number of log entries to fetch per query during read/validation phase",

    type: "int",
    default: 60000
  });

  parser.add_argument("--retry-post-deadline-seconds", {
    help: "Maximum time spent retrying POST requests, in seconds",
    type: "int",
    default: 360
  });

  parser.add_argument("--retry-post-min-delay-seconds", {
    help: "Minimal delay between POST request retries, in seconds",
    type: "int",
    default: 2
  });

  parser.add_argument("--retry-post-max-delay-seconds", {
    help: "Maximum delay between POST request retries, in seconds",
    type: "int",
    default: 30
  });

  parser.add_argument("--retry-post-jitter", {
    help: "Relative jitter to apply for calculating the retry delay (1: max)",
    type: "float",
    default: 0.5
  });

  parser.add_argument("--bearer-token-file", {
    help:
      "Read authentication token from file. Add header `Authorization: Bearer <token>` to each HTTP request.",
    type: "str",
    default: ""
  });

  CFG = parser.parse_args();

  setLogger(
    buildLogger({
      stderrLevel: CFG.logLevel
    })
  );

  const uniqueInvocationId = `looker-${START_TIME_EPOCH}-${rndstring(10)}`;
  CFG.invocation_id = uniqueInvocationId;

  if (CFG.log_start_time) {
    // let this blow up for now
    ZonedDateTime.parse(CFG.log_start_time);
  } else {
    // Set default for log starttime: invocation time.
    CFG.log_start_time = timestampToRFC3339Nano(START_TIME_JODA);
  }

  if (CFG.stream_write_n_seconds !== 0) {
    // For now: use very big number to effectively make the dummystream appear
    // infinitely long, so that it's only limited by the wall time passed.
    CFG.stream_write_n_fragments = 10 ** 14;
  }

  if (CFG.change_streams_every_n_cycles > CFG.n_cycles) {
    log.error("change_streams_every_n_cycles must not be larger than n_cycles");
    process.exit(1);
  }

  if (CFG.max_concurrent_writes > CFG.n_concurrent_streams) {
    log.error(
      "max_concurrent_writes must not be larger than n_concurrent_streams"
    );
    process.exit(1);
  }

  if (CFG.stream_write_n_seconds_jitter) {
    if (CFG.stream_write_n_seconds === 0) {
      log.error(
        "stream_write_n_seconds_jitter can only be used with stream_write_n_seconds"
      );
      process.exit(1);
    }
    if (CFG.stream_write_n_seconds_jitter > CFG.stream_write_n_seconds) {
      log.error(
        "stream_write_n_seconds_jitter must be smaller than stream_write_n_seconds"
      );
      process.exit(1);
    }
  }

  if (CFG.max_concurrent_writes === 0) {
    CFG.max_concurrent_writes = CFG.n_concurrent_streams;
  }

  if (CFG.bearer_token_file !== "") {
    try {
      // Strip leading and trailing whitespace. Otherwise, for example a
      // trailing newline (as it's written by any sane editor like e.g. vim)
      // would result in an invalid file.
      BEARER_TOKEN = fs
        .readFileSync(CFG.bearer_token_file, {
          encoding: "utf8"
        })
        .trim();
    } catch (err) {
      log.error(
        "failed to read file %s: %s",
        CFG.bearer_token_file,
        err.message
      );
      process.exit(1);
    }
    log.info(
      "authentication token read from bearer_token_file `%s` (%s characters)",
      CFG.bearer_token_file,
      BEARER_TOKEN.length
    );
  }

  if (CFG.retry_post_jitter <= 0 || CFG.retry_post_jitter >= 1) {
    log.error("retry_post_jitter must be larger than 0 and smaller than 1");
    process.exit(1);
  }

  log.info("rendered config:\n%s", JSON.stringify(CFG, null, 2));
}

function setUptimeGauge() {
  // Set this in various places of the program visted regularly.
  const uptimeSeconds = mtimeDiffSeconds(START_TIME_MONOTONIC);
  gauge_uptime.set(Math.round(uptimeSeconds));
}

async function main() {
  parseCmdlineArgs();
  const httpServerTerminator = setupPromExporter();

  //let dummystreams: Array<DummyStream>;
  let dummystreams: Array<DummyStream | DummyTimeseries>;

  for (let cyclenum = 1; cyclenum < CFG.n_cycles + 1; cyclenum++) {
    setUptimeGauge();

    const numString = `${cyclenum.toString().padStart(5, "0")}`;
    const guniqueCycleId = `${CFG.invocation_id}-${numString}-${rndstring(5)}`;

    log.info("enter write/read cycle  %s", cyclenum);

    if ((cyclenum - 1) % CFG.change_streams_every_n_cycles === 0) {
      // rely on cyclenum to start at 1, 0 % N is 0 so that in the first
      // run some dummystreams are created!
      log.info("cycle %s: create new dummystreams", cyclenum);
      dummystreams = createNewDummyStreams(guniqueCycleId);
    } else {
      log.info(
        "cycle %s: continue to use dummystreams of previous cycle",
        cyclenum
      );
    }

    counter_rw_cycles.inc();

    // wrap performWriteReadCycle() in an overgeneralized error handler "just"
    // to more reliably crash looker, see CH1288. I'd love for all unexpected
    // errors to crash the runtime instead.
    try {
      // we know better than:
      //  error TS2454: Variable 'dummystreams' is used before being assigned.
      // the first iteration sets dummystreams.
      //@ts-expect-error: see comment above
      await performWriteReadCycle(cyclenum, dummystreams, guniqueCycleId);
    } catch (err) {
      log.crit("err during write/read cycle: %s", err);
      process.exit(1);
    }
  }

  log.info("shutting down http server");
  httpServerTerminator.terminate();
}

function createNewDummyStreams(
  guniqueCycleId: string
): Array<DummyStream | DummyTimeseries> {
  const streams = [];

  for (let i = 1; i < CFG.n_concurrent_streams + 1; i++) {
    const streamname = `${guniqueCycleId}-${i.toString().padStart(4, "0")}`;

    // by default attach one label to the stream
    const labelset: LogStreamLabelset = {
      streamname: streamname
    };

    // add more labels (key/value pairs) as given by command line
    // without further validation
    if (CFG.additional_labels !== undefined) {
      log.info(
        "adding additional labels: %s",
        JSON.stringify(CFG.additional_labels)
      );
      for (const kvpair of CFG.additional_labels) {
        labelset[kvpair[0]] = kvpair[1];
      }
    }

    let stream: DummyTimeseries | DummyStream;
    if (CFG.metrics_mode) {
      stream = new DummyTimeseries({
        metricName: `metric_looker_${rndstring(6)}`,
        n_samples_per_series_fragment: Number(
          CFG.n_entries_per_stream_fragment
        ),

        // Start earlier than given by starttime so that default ('now') works.
        // With Cortex' Blocks Storage system, we cannot go into the future
        // compared to "now" (from Cortex' system time point of view), but we
        // also cannot fall behind for more than 60 minutes, see
        // https://github.com/cortexproject/cortex/issues/2366. That means that
        // the wall time passed after DummyTimeseries initialization matters.
        // How exactly it matters depends on the synthetically created time
        // difference between adjacent metric samples and the push rate. Before
        // building a system that allows for precise control here (and a
        // potential automatic correction), let the human operator of Looker
        // use the one hour leeway that we have here in a 'smart' way. Let
        // each DummyTimeseries start in the _center_ of the timewindow, i.e
        // 30 minutes in the past compared to now.
        starttime: ZonedDateTime.parse(CFG.log_start_time)
          .minusMinutes(30)
          .withNano(0),
        uniqueName: streamname,
        timediffMilliSeconds: CFG.metrics_time_increment_ms,
        labelset: labelset
      });
    } else {
      stream = new DummyStream({
        n_entries_per_stream_fragment: Number(
          CFG.n_entries_per_stream_fragment
        ),
        n_chars_per_message: Number(CFG.n_chars_per_msg),
        starttime: ZonedDateTime.parse(CFG.log_start_time),
        uniqueName: streamname,
        timediffNanoseconds: CFG.log_time_increment_ns,
        includeTimeInMsg: true,
        labelset: labelset,
        compressability: CFG.compressability
      });
    }

    const msg = `Initialized dummystream: ${stream}. Time of first entry in stream: ${stream.currentTimeRFC3339Nano()}`;
    if (i % 1000 == 0) {
      log.info(msg + " (999 msgs like this hidden)");
      // Allow for more or less snappy SIGINTing this initialization step.
      await sleep(0.0001);
    } else {
      log.debug(msg);
    }
    streams.push(stream);
  }
  return streams;
}

async function performWriteReadCycle(
  cyclenum: number,
  dummystreams: Array<DummyStream | DummyTimeseries>,
  guniqueCycleId: string
) {
  CYCLE_START_TIME_MONOTONIC = mtime();
  CYCLE_STOP_WRITE_AFTER_SECONDS = CFG.stream_write_n_seconds;

  if (CFG.stream_write_n_seconds_jitter !== 0) {
    const jitter = rndFloatFromInterval(
      -CFG.stream_write_n_seconds_jitter,
      CFG.stream_write_n_seconds_jitter
    );
    CYCLE_STOP_WRITE_AFTER_SECONDS += jitter;
    log.info(
      "CYCLE_STOP_WRITE_AFTER_SECONDS: (%s + %s) s",
      CFG.stream_write_n_seconds,
      jitter.toFixed(2)
    );
  }

  const writestats = await writePhase(dummystreams);
  const readstats = await readPhase(dummystreams);

  const report = {
    argv: process.argv,
    renderedConfig: CFG,
    invocationTime: timestampToRFC3339Nano(START_TIME_JODA),
    cycleStats: {
      cycleNum: cyclenum,
      guniqueCycleId: guniqueCycleId,
      write: writestats,
      read: readstats
    }
  };
  log.info("Report:\n%s", JSON.stringify(report, null, 2));
  const reportFilePath = `${guniqueCycleId}.report.json`;
  fs.writeFileSync(reportFilePath, JSON.stringify(report, null, 2));
  log.info("wrote report to %s", reportFilePath);
}

async function writePhase(streams: Array<DummyStream | DummyTimeseries>) {
  const fragmentsPushedBefore = COUNTER_STREAM_FRAGMENTS_PUSHED;
  const wt0 = mtime();

  await postFragments(streams, CFG.apibaseurl);

  // A little summary about pushing all data.
  const writeDurationSeconds = mtimeDiffSeconds(wt0);

  const nStreamFragmentsSent = Number(
    COUNTER_STREAM_FRAGMENTS_PUSHED - fragmentsPushedBefore
  );

  for (const stream of streams) {
    log.debug(
      "stream %s: wrote %s fragment(s)",
      stream.uniqueName,
      stream.nFragmentsSuccessfullySentSinceLastValidate
    );
  }

  log.info("fragments POSTed in write phase: %s", nStreamFragmentsSent);
  const nEntriesSent = nStreamFragmentsSent * CFG.n_entries_per_stream_fragment;
  let nPayloadBytesSent = nEntriesSent * CFG.n_chars_per_msg;

  if (CFG.metrics_mode) {
    // Think: payload bytes sent, i.e. sample bytes excluding timestamp. In
    // Prometheus, a sample value is a double precision floating point number,
    // i.e. set this to the number of samples sent times 8 Bytes.
    nPayloadBytesSent = nEntriesSent * 8;
  }

  const megaPayloadBytesSent = nPayloadBytesSent / 10 ** 6; // int division ok?
  const megaPayloadBytesSentPerSec =
    megaPayloadBytesSent / writeDurationSeconds;

  const stats: WriteStats = {
    nEntriesSent: nEntriesSent,
    nPayloadBytesSent: nPayloadBytesSent,
    entriesSentPerSec: nEntriesSent / writeDurationSeconds,
    megaPayloadBytesSentPerSec: megaPayloadBytesSentPerSec,
    durationSeconds: writeDurationSeconds
  };

  log.info(
    "End of write phase. Log entries / metric samples sent: %s, Payload bytes sent: %s million",
    nEntriesSent,
    megaPayloadBytesSent.toFixed(2)
  );
  log.info(
    "Payload write net throughput (mean): %s million bytes per second (assumes utf8 for logs and 8 byte per sample for metrics)",
    megaPayloadBytesSentPerSec.toFixed(2)
  );

  for (const stream of streams) {
    log.debug(
      "Stats of last-consumed fragment of stream %s: %s",
      stream.uniqueName,
      stream.lastFragmentConsumed?.stats //currentTimeRFC3339Nano()
    );
  }

  return stats;
}

async function throttledFetchAndValidate(
  semaphore: Semaphore,
  stream: DummyStream | DummyTimeseries
) {
  let fetchresult;

  const st0 = mtime();
  const release = await semaphore.acquire();
  log.debug(
    "fetchAndValidate held back by semaphore for %s s",
    mtimeDiffSeconds(st0).toFixed(2)
  );
  try {
    fetchresult = await unthrottledFetchAndValidate(stream);
  } catch (err) {
    log.info("err in sem-protected, release, re-throw");
    release();
    throw err;
  }
  release();
  return fetchresult;
}

async function unthrottledFetchAndValidate(
  stream: DummyStream | DummyTimeseries
) {
  const inspectEveryNthEntry = 200;
  // const headers: Record<string, string> = {};
  // if (BEARER_TOKEN) {
  //   headers["Authorization"] = `Bearer ${BEARER_TOKEN}`;
  // }
  if (CFG.metrics_mode) {
    const opts: DummyTimeseriesFetchAndValidateOpts = {
      querierBaseUrl: CFG.apibaseurl,
      chunkSize: CFG.fetch_n_entries_per_query,
      inspectEveryNthEntry: inspectEveryNthEntry,
      //additionalHeaders: headers,
      customHTTPGetFunc: httpGETRetryUntil200OrError
    };
    return await stream.fetchAndValidate(opts);
  }
  const opts: DummyStreamFetchAndValidateOpts = {
    querierBaseUrl: CFG.apibaseurl,
    chunkSize: CFG.fetch_n_entries_per_query,
    inspectEveryNthEntry: inspectEveryNthEntry,
    customLokiQueryFunc: queryLokiWithRetryOrError // only used by DummyStream.fetchAndValidate: has custom header injection
  };
  return await stream.fetchAndValidate(opts);
}

async function readPhase(dummystreams: Array<DummyStream | DummyTimeseries>) {
  log.info("entering read / validation phase");
  const validators = [];
  const vt0 = mtime();

  if (CFG.max_concurrent_reads === 0) {
    for (const stream of dummystreams) {
      validators.push(unthrottledFetchAndValidate(stream));
    }
  } else {
    const semaphore = new Semaphore(CFG.max_concurrent_reads);
    for (const stream of dummystreams) {
      validators.push(throttledFetchAndValidate(semaphore, stream));
    }
  }

  let nEntriesReadArr;
  try {
    // each validator returns the number of entries read (and validated)
    nEntriesReadArr = await Promise.all(validators);
  } catch (err) {
    log.crit("error during validation: %s", err);
    process.exit(1);
  }

  const nEntriesRead = nEntriesReadArr.reduce((a, b) => a + b, 0);
  //log.info("nEntriesReadArr sum: %s", nEntriesRead);

  const readDurationSeconds = mtimeDiffSeconds(vt0);
  log.info(
    "validation (read) took %s s overall",
    readDurationSeconds.toFixed(1)
  );

  // assume that exact payload was read as previously sent for now
  // TODO: build these stats on the fly during readout and expect numbers
  // to match write?
  //const nEntriesRead = STATS_WRITE.nEntriesSent;
  let nPayloadBytesRead = nEntriesRead * CFG.n_chars_per_msg;

  if (CFG.metrics_mode) {
    // 64 bit floating point, i.e. 8 bytes per sample
    nPayloadBytesRead = nEntriesRead * 8;
  }

  const megaPayloadBytesRead = nPayloadBytesRead / 10 ** 6;

  const stats: ReadStats = {
    nEntriesRead: nEntriesRead,
    nPayloadBytesRead: nPayloadBytesRead,
    entriesReadPerSec: nEntriesRead / readDurationSeconds,
    megaPayloadBytesReadPerSec: megaPayloadBytesRead / readDurationSeconds,
    durationSeconds: readDurationSeconds
  };
  return stats;
}

/*
For each stream, send all fragments (until stop criterion is hit).

For each DummyStream, create one function that produces and POSTs pushrequests.
A "pushrequest" is a Prometheus term for a (snappy-compressed) protobuf message
carrying log/metric payload data.
*/
export async function postFragments(
  streams: Array<DummyStream | DummyTimeseries>,
  lokiPushBaseUrl: string
) {
  const actors = [];

  const writeConcurSemaphore = new Semaphore(CFG.max_concurrent_writes);

  // Create N_concurrent_streams (think: upper bound towards 10**5 or 10**6?)
  // actors, but throttle their main activity (fragment generation and
  // serialization) to N_concurrent_writes (think: upper bound between 10**2
  // and 10**3).
  for (const stream of streams) {
    actors.push(pushrequestProducerAndPOSTer(stream, writeConcurSemaphore));
  }

  // Wait for producers and consumers to return.
  await Promise.all(actors);
}

// Part of the body of the while(true) {} main loop of
// pushrequestProducerAndPOSTer().
async function _produceAndPOSTpushrequest(
  stream: DummyStream | DummyTimeseries,
  semaphore: Semaphore
) {
  // TODO: THROTTLE
  // TODO: metric for fragment generation duration

  // Throttle, not only the number of concurrent POST requests, but also the
  // number of concurrent fragment generators. In an earlier version,
  // fragment generators always ran for N_concurrent_streams, preparing the
  // serialized fragments for a potentially much smaller number of
  // N_concurrent_writes. For N_concurrent_streams being large (say, between
  // 10**3 and 10**4), that imposed a scaling challenge: CPU and mem
  // requirements were 'needlessly' intense. Pro was: once a pusher was ready
  // to make a POST request, a corresponding stream fragment was already
  // serealized (prepared in memory). Now, in this simpler architecture,
  // N_concurrent_writes controls. When a pusher gets ready (acquires the
  // sema), then it first has to generate and serialize a fragment. If that
  // ever becomes a problem, it can certainly be changed/optimized again. Pro
  // of this new approach: Memory consumption is dominated by holding
  // N_concurrent_writes fragments in memory (which is O(10**2) in common
  // cases), and N_concurrent_streams can go towards O(10**5) or even
  // O(10**6).
  const st0 = mtime();
  const releaseWriteSemaphore = await semaphore.acquire();
  log.debug(
    "pushrequestProducerAndPOSTer held back by semaphore for %s s",
    mtimeDiffSeconds(st0).toFixed(2)
  );

  // This function is just a way to make the block of code explicit that's
  // protected by the semaphore.
  async function _genAndPost() {
    // Note: generateAndGetNextFragment() does not have a stop criterion
    // itself, the stop criteria are defined above, based on wall time passed
    // or the number of fragments already consumed for this stream.
    const fragment = stream.generateAndGetNextFragment();
    stream.lastFragmentConsumed = fragment;

    const t0 = mtime();
    const pushrequest = fragment.serialize(); //toPushrequest();
    const genduration = mtimeDiffSeconds(t0);

    const pr = pushrequest;
    const name = `prProducerPOSTer for ${stream.uniqueName}`;

    if (
      COUNTER_FRAGMENT_STATS_LOG_THROTTLE < 1 ||
      COUNTER_FRAGMENT_STATS_LOG_THROTTLE % 200 == 0
    ) {
      log.info(
        "%s: generated serialized fragment in %s s for stream %s (index: %s/%s size: %s MiB). POST it (not logged for every case).",
        name,
        genduration.toFixed(2),
        pr.fragment.parent?.uniqueName,
        pr.fragment.indexString(3),
        CFG.stream_write_n_fragments,
        pr.dataLengthMiB.toFixed(4)
      );
    }
    COUNTER_FRAGMENT_STATS_LOG_THROTTLE++;

    const postT0 = mtime();
    try {
      // Do not use pr.postWithRetryOrError() which is super simple,
      // but use a custom function with CLI arg-controlled retrying
      // parameters etc.
      await customPostWithRetryOrError(pr, CFG.apibaseurl);
    } catch (err) {
      log.crit("consider critical: %s", err);
      process.exit(1);
    }

    const postDurationSeconds = mtimeDiffSeconds(postT0);
    hist_duration_post_with_retry_seconds.observe(postDurationSeconds);

    COUNTER_STREAM_FRAGMENTS_PUSHED++;
    counter_fragments_pushed.inc();
    counter_log_entries_pushed.inc(CFG.n_entries_per_stream_fragment);

    // Convert BigInt to Number and assume that the numbers are small enough
    counter_payload_bytes_pushed.inc(Number(pr.fragment.payloadByteCount()));
    counter_serialized_fragments_bytes_pushed.inc(pr.dataLengthBytes);
    gauge_last_http_request_body_size_bytes.set(pr.dataLengthBytes);
  }

  // Note(JP): any error in _genAndPost(), at the time of writing, should by
  // design lead to program crash. That is, technically, there is no need to do
  // rock-solid semaphore release upon error. But, as things may change in the
  // future, structure the code towards proper cleanup, which is what this
  // tight error handling block is supposed to do: catch any error, release
  // semaphore, re-throw.
  try {
    await _genAndPost();
  } catch (err) {
    log.info("err in sem-protected, release, re-throw");
    releaseWriteSemaphore();
    throw err;
  }
  releaseWriteSemaphore();
}

async function pushrequestProducerAndPOSTer(
  stream: DummyStream | DummyTimeseries,
  semaphore: Semaphore
) {
  let fragmentsPushed = 0;

  while (true) {
    if (CYCLE_STOP_WRITE_AFTER_SECONDS !== 0) {
      const secondsSinceCycleStart = mtimeDiffSeconds(
        CYCLE_START_TIME_MONOTONIC
      );
      if (secondsSinceCycleStart > CYCLE_STOP_WRITE_AFTER_SECONDS) {
        log.debug(
          "prProducerPOSTer for %s: %s seconds passed: stop producer",
          stream.uniqueName,
          secondsSinceCycleStart.toFixed(2)
        );
        return;
      }
    }

    if (CFG.stream_write_n_fragments == fragmentsPushed) {
      log.debug(
        "prProducerPOSTer for %s: %s fragments created and pushed: stop producer",
        stream.uniqueName,
        fragmentsPushed
      );
      return;
    }

    await _produceAndPOSTpushrequest(stream, semaphore);
    // perspective: consumed from stream object, and also pushed out. if a
    // fragment is consumed from a stream object and the push subsequently
    // fails, then the program crashes. That is, by the _end of a write cycle_
    // it is safe to inspect a stream object and ask it how many fragments were
    // generated for it, and to then assume that the same number has actually
    // been POSTed to the remote system.
    fragmentsPushed += 1;
  }
}

/* Calculate delay in seconds _before_ performing the attempt `attempt`.

Definition: attempt 1 is the first attempt, i.e. not a retry.
*/
function calcDelayBetweenPostRetries(attempt: number): number {
  if (attempt === 1) {
    return 0;
  }

  // Choose base delay using an exponential backoff technique. The base 1.6 is
  // chosen based on taste, by looking at the series:
  //
  //   >>> [f'{b:.2f}' for b in ((1.6 ** a)/2.56 for a in range(2,10))]
  //   ['1.00', '1.60', '2.56', '4.10', '6.55', '10.49', '16.78', '26.84']
  //
  // The first value is for a = 2. That is, attempt 2 (which is the _first_
  // retry!) is performed with a base delay of 1 second.
  const expBackoff = 1.6 ** attempt / 2.56;

  // Scale this (linearly) with the minimal desired delay time, so that between
  // the first two attempts the (unjittered) delay is precisely that time.
  const unjitteredDelay = expBackoff * CFG.retry_post_min_delay_seconds;

  // Add jitter: +/- 50 % (by default, with `CFG.retry_post_jitter` being set
  // to 0.5) of the so far chosen backoff value.
  const jitter = rndFloatFromInterval(
    -CFG.retry_post_jitter * unjitteredDelay,
    CFG.retry_post_jitter * unjitteredDelay
  );
  const backoffPlusJitter = unjitteredDelay + jitter;
  log.debug(
    `calcDelayBetweenPostRetries: expBackoff: ${expBackoff.toFixed(2)}, ` +
      `unjitteredDelay: ${unjitteredDelay.toFixed(2)}, jitter: ${jitter.toFixed(
        2
      )}  ` +
      `-> ${backoffPlusJitter.toFixed(2)}`
  );

  if (backoffPlusJitter > CFG.retry_post_max_delay_seconds) {
    // Rely on the idea that the individual retrying process has been random
    // enough (accumulated enough jitter) so far, simply return this cap.
    log.debug(
      "calcDelayBetweenPostRetries: return cap: %s",
      CFG.retry_post_max_delay_seconds
    );
    return CFG.retry_post_max_delay_seconds;
  }
  return backoffPlusJitter;
}

async function customPostWithRetryOrError(
  pr: LogStreamFragmentPushRequest | TimeseriesFragmentPushMessage,
  baseUrl: string
) {
  const deadline = mtimeDeadlineInSeconds(CFG.retry_post_deadline_seconds);
  let attempt = 0;
  while (true) {
    attempt++;

    const delay = calcDelayBetweenPostRetries(attempt);
    if (attempt > 1) {
      log.info(
        "POST %s: schedule to perform attempt %s in %s s",
        pr,
        attempt,
        delay.toFixed(2)
      );
      await sleep(delay);
    }

    const overDeadline = mtimeDiffSeconds(deadline);
    if (overDeadline > 0) {
      throw new Error(
        `Failed to POST ${pr}: attempt ${attempt} would trigger ` +
          `${overDeadline.toFixed(2)} s over the deadline (${
            CFG.retry_post_deadline_seconds
          } s).`
      );
    }

    setUptimeGauge();

    let pushpath = "/loki/api/v1/push";
    if (CFG.metrics_mode) {
      pushpath = "/api/v1/push";
    }

    let response;
    try {
      response = await httpPostProtobuf(
        `${baseUrl}${pushpath}`,
        pr.data,
        pr.postHeaders
      );
    } catch (e) {
      if (e instanceof got.RequestError) {
        // Note(JP): this code block is meant to handle only transient errors
        // (TCP conn errors/ timeout errors). I do hope that `e instanceof
        // got.RequestError` is not too specific, we will see.

        // Reflect this transient error in Prom counter. We could add a stream
        // name label here so that this error is associated with a specific
        // dummystream.
        counter_post_non_http_errors.inc();

        // Example log message: `POST
        // PushRequest(md5=434f0758a5df51275ba0f188ab9b07a2): attempt 1 failed
        // with: socket hang up`
        log.warning(
          `POST ${pr}: attempt ${attempt}: transient problem: ${e.message}`
        );
        // Move on to next attempt.
        continue;
      } else {
        // Assume that this is a programming error, let program crash.
        throw e;
      }
    }

    // Rely on that when we're here that we actually got an HTTP response, i.e.
    // a status code is known.
    counter_post_responses.inc({ statuscode: response.statusCode });

    if ([200, 204].includes(response.statusCode)) {
      logHTTPResponseLight(response, `${pr}`);
      // Keep track of the fact that this was successfully pushed out,
      // important for e.g. read-based validation after write.

      // dummystream version
      // also works for dummyseries but is noop
      pr.fragment.parent!.nFragmentsSuccessfullySentSinceLastValidate += 1;

      pr.fragment.buildStatisticsAndDropData();

      // dummyseries version
      // drop actual samples (otherwise mem usage would grow quite fast).
      if (pr.fragment instanceof TimeseriesFragment) {
        pr.fragment.parent!.postedFragmentsSinceLastValidate.push(pr.fragment);
      }
      return;
    }

    if (response.statusCode === 429) {
      log.info(`429 resp, sleep 2, body[:200]: ${response.body.slice(0, 200)}`);
      // Move on to next attempt.
      continue;
    }

    // We got an HTTP response that reveals a request error or a transient
    // problem. We want to learn as much as we can about both: log HTTP
    // response in more detail.
    logHTTPResponse(response, `${pr}`);

    // Handle what's most likely permanent errors with the request
    if (response.statusCode.toString().startsWith("4")) {
      throw new Error("Bad HTTP request (see log above)");
    }

    // All other HTTP responses: treat as transient problems
    log.info("Treat as transient problem, retry after sleep");
  }
}

// The Loki query system may get overwhelmed easily (emitting 500s and 502s).
// for now all we need is a functioning readout, even if it's slow-ish.
// therefore, retry a couple of times (no backoff for simplicity for now). this
// retry loop is intended for transient TCP errors and transient HTTP errors
// (5xx, also 429)
async function httpGETRetryUntil200OrError(
  url: string,
  gotRequestOptions: any
): Promise<GotResponse<string>> {
  const maxRetries = 10;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    setUptimeGauge();

    let response;

    // If desired, decorate HTTP request with authentication token.
    if (BEARER_TOKEN) {
      if (gotRequestOptions.headers === undefined) {
        gotRequestOptions.headers = {};
      }
      gotRequestOptions.headers["Authorization"] = `Bearer ${BEARER_TOKEN}`;
    }

    try {
      response = await got(url, gotRequestOptions);
    } catch (e) {
      if (e instanceof got.RequestError) {
        // Note(JP): this code block is meant to handle only transient errors
        // (TCP conn errors/ timeout errors). I do hope that `e instanceof
        // got.RequestError` is not too specific, we will see.

        // Reflect this transient error in Prom counter. We could add a stream
        // name label here so that this error is associated with a specific
        // dummystream.
        counter_get_non_http_errors.inc();

        log.warning(`Query: attempt ${attempt} failed with ${e.message}`);

        // Note(JP): pragmatic time constant for now
        await sleep(3.0);

        // Move on to next attempt.
        continue;
      } else {
        // Assume that this is a programming error, let program crash.
        throw e;
      }
    }

    // Rely on that when we're here that we actually got an HTTP response,
    // i.e. a status code is known.
    counter_get_responses.inc({ statuscode: response.statusCode });

    if (response.statusCode === 200) {
      logHTTPResponseLight(response);
      // In the corresponding DummyStream object keep track of the fact that
      // this was successfully pushed out, important for e.g. read-based
      // validation after write.
      return response;
    }

    if (response.statusCode === 429) {
      log.info(`429 resp, sleep 2, body[:200]: ${response.body.slice(0, 200)}`);
      await sleep(3.0);

      // Move on to next attempt.
      continue;
    }

    // We got an HTTP response that reveals a request error or a transient
    // problem. We want to learn as much as we can about both: log HTTP
    // response in more detail.
    logHTTPResponse(response);

    // Handle what's most likely permanent errors with the request
    if (response.statusCode.toString().startsWith("4")) {
      throw new Error("Bad HTTP request (see log above)");
    }

    // All other HTTP responses: treat as transient problems
    log.info("Treat as transient problem, retry");
  }
  throw new Error(
    `Failed to GET after ${maxRetries} attempts. Request options: ${JSON.stringify(
      gotRequestOptions,
      null,
      2
    )}`
  );
}

async function queryLokiWithRetryOrError(
  lokiQuerierBaseUrl: string,
  queryParams: Record<string, string>,
  expectedEntryCount: number,
  chunkIndex: number,
  stream: DummyStream
): Promise<LokiQueryResult> {
  log.info("looker-specific query func");

  // wrap httpGETRetryUntil200OrError() and inspect entry count.
  async function _queryAndCountEntries(
    lokiQuerierBaseUrl: string,
    queryParams: Record<string, string>
  ) {
    // httpGETRetryUntil200OrError() retries internally upon transient
    // problems. If no error this thrown then `response` represents a 200 HTTP
    // response.

    const url = `${CFG.apibaseurl}/loki/api/v1/query_range`;

    const gotRequestOptions = {
      retry: 0,
      throwHttpErrors: false,
      searchParams: new URLSearchParams(queryParams),
      timeout: httpTimeoutSettings,
      https: { rejectUnauthorized: false } // disable TLS server cert verification for now
    };

    const response = await httpGETRetryUntil200OrError(url, gotRequestOptions);
    const data = JSON.parse(response.body);

    // expect 1 stream with non-zero entries, maybe assert on that here.
    const entrycount = data.data.result[0].values.length;
    // log.info(
    //   "expected nbr of query results: %s, got %s",
    //   expectedEntryCount,
    //   entrycount
    // );

    // Expect N log entries in the stream.
    if (entrycount === expectedEntryCount) {
      const labels = data.data.result[0].stream; //logqlKvPairTextToObj(data["streams"][0]["labels"]);
      const result: LokiQueryResult = {
        entries: data.data.result[0].values,
        labels: labels,
        textmd5: "disabled"
      };
      return result;
    }
    throw new Error(
      `unexpected entry count returned in query result: ${entrycount} ` +
        `(expected: ${expectedEntryCount}). stream: ${stream.uniqueName} chunkIndex: ${chunkIndex}`
    );
  }

  // Retry `_queryAndCountEntries` N times. It has an inner retry loop for
  // transient errors. This outer retry loop retries upon errors like
  // unexpected count of log entries in query result (which might be a
  // permanent error condition or actually be resolved with a retry, need to
  // know).
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await _queryAndCountEntries(lokiQuerierBaseUrl, queryParams);
    } catch (err) {
      counter_unexpected_query_results.inc();
      log.warning(
        `_queryAndCountEntries() failed with \`${err.message}\`, retry soon`
      );
      await sleep(5.0);
    }
  }

  throw new Error(
    `_queryAndCountEntries() failed ${maxRetries} times. ` +
      `stream: ${stream.uniqueName} chunkIndex: ${chunkIndex}`
  );
}

export function logHTTPResponseLight(
  resp: GotResponse,
  requestDetail?: string
) {
  let reqDetailForLog = "";
  if (requestDetail !== undefined) {
    reqDetailForLog = requestDetail;
  }

  const t1 = (resp.timings.phases.total ?? -1000) / 1000.0;
  const t2 = (resp.timings.phases.firstByte ?? -1000) / 1000.0;
  const msg = `resp to ${resp.request.options.method} ${reqDetailForLog} -> ${
    resp.statusCode
  }. total time: ${t1.toFixed(2)} s. resp time: ${t2.toFixed(2)} `;

  // Info-log only every Nth response -- maybe expose N through CLI.
  const logEveryN = 400;
  if (COUNTER_HTTP_RESP_LOG_THROTTLE % 400 == 0) {
    log.info(`${msg} (${logEveryN - 1} msgs like this hidden)`);
  } else {
    log.debug(msg);
  }

  COUNTER_HTTP_RESP_LOG_THROTTLE++;
}

function logHTTPResponse(
  resp: GotResponse<string> | GotResponse<Buffer>,
  requestDetail?: string
) {
  let reqDetailForLog = "";
  if (requestDetail !== undefined) {
    reqDetailForLog = ` (${requestDetail})`;
  }
  // `slice()` works regardless of Buffer or string.
  let bodyPrefix = resp.body.slice(0, 500);
  // If buffer: best-effort decode the buffer into text (this method does _not_
  // not blow up upon unexpected byte sequences).
  if (Buffer.isBuffer(bodyPrefix)) bodyPrefix = bodyPrefix.toString("utf-8");

  const ts = resp.timings;

  log.info(`HTTP resp to ${resp.request.options.method}(${
    resp.requestUrl
  }${reqDetailForLog}):
  status: ${resp.statusCode}
  body[:500]: ${bodyPrefix}
  headers: ${JSON.stringify(resp.headers)}
  totalTime: ${(ts.phases.total ?? -1000) / 1000.0} s
  dnsDone->TCPconnectDone: ${(ts.phases.tcp ?? -1000) / 1000.0} s
  connectDone->reqSent ${(ts.phases.request ?? -1000) / 1000.0} s
  reqSent->firstResponseByte: ${(ts.phases.firstByte ?? -1000) / 1000.0} s
  `);
}

async function httpPostProtobuf(
  url: string,
  data: Buffer,
  headers: Record<string, string>
) {
  // log.info("httpPostProtobuf data: %s", data);

  if (BEARER_TOKEN) {
    headers = { ...headers, Authorization: `Bearer ${BEARER_TOKEN}` };
  }

  const response = await got.post(url, {
    body: data,
    throwHttpErrors: false,
    headers: headers,
    https: { rejectUnauthorized: false }, // disable TLS server cert verification for now
    timeout: {
      // If a TCP connect() takes longer then ~5 seconds then most certainly there
      // is a networking issue, fail fast in that case.
      connect: 5000,
      request: 60000
    }
  });
  return response;
}

function setupPromExporter() {
  // Collect NodeJS runtime metrics and others, see /metrics
  promclient.collectDefaultMetrics();

  const defaultLabels = {
    looker_invocation_id: CFG.invocation_id,
    looker_hostname: os.hostname()
  };
  promclient.register.setDefaultLabels(defaultLabels);

  const httpapp = express();

  httpapp.get(
    "/metrics",
    function (req: express.Request, res: express.Response) {
      log.info("handling request to /metrics");
      res.send(promclient.register.metrics());
    }
  );

  const httpserver = httpapp.listen(CFG.http_server_port, () =>
    log.info("HTTP server listening on port %s", CFG.http_server_port)
  );

  // httpserver.close() will not initiate a clean shutdown.
  // see opstrace-prelaunch/issues/640

  const httpServerTerminator = createHttpTerminator({
    server: httpserver
  });

  return httpServerTerminator;
}

function rndFloatFromInterval(min: number, max: number) {
  // half-closed: [min, max)
  return Math.random() * (max - min) + min;
}

// https://stackoverflow.com/a/6090287/145400
if (require.main === module) {
  process.on("SIGINT", function () {
    log.info("Received SIGINT, exiting");
    process.exit(1);
  });

  // NodeJS 12 does not crash by default upon unhandled promise rejections.
  // Make it crash.
  process.on("unhandledRejection", err => {
    throw err;
  });

  main();
}
