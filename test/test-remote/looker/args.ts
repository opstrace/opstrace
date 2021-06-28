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

import fs from "fs";
import { strict as assert } from "assert";

import argparse from "argparse";
import { ZonedDateTime } from "@js-joda/core";

import { rndstring, timestampToRFC3339Nano } from "./util";

import { log, buildLogger, setLogger } from "./log";

import { DEFAULT_LOG_LEVEL_STDERR, START_TIME_JODA } from "./index";

interface CfgInterface {
  n_concurrent_streams: number;
  n_chars_per_msg: number;
  n_entries_per_stream_fragment: number;
  n_cycles: number;
  n_fragments_per_push_message: number;
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
  skip_read: boolean;
  read_n_streams_only: number;
}

export let CFG: CfgInterface;
export let BEARER_TOKEN: undefined | string;

export function parseCmdlineArgs(): void {
  const parser = new argparse.ArgumentParser({
    description: "Looker test runner"
  });

  parser.add_argument("apibaseurl", {
    help: "Loki API base URL (Cortex API base URL in metrics mode)",
    type: "str"
  });

  parser.add_argument("--log-level", {
    help:
      `Set log level for output on stderr. ` +
      `One of: debug, info, warning, error. ` +
      `Default: ${DEFAULT_LOG_LEVEL_STDERR}`,
    type: "str",
    choices: ["debug", "info", "warning", "error"],
    default: DEFAULT_LOG_LEVEL_STDERR,
    metavar: "LEVEL",
    dest: "logLevel"
  });

  parser.add_argument("--metrics-mode", {
    help:
      "metrics mode (Cortex) instead of logs mode (Loki) -- " +
      "metrics mode was added later in a quick and dirty fashion, still visible",
    action: "store_true",
    default: false
  });

  // note: maybe rename to --n-streams, because concurrency is controlled
  // differently
  parser.add_argument("--n-concurrent-streams", {
    help:
      "number of log streams to create per write/read cycle " +
      "(or number of metric streams)",
    type: "int",
    required: true
  });

  parser.add_argument("--n-entries-per-stream-fragment", {
    help:
      "number of log entries per log stream fragment (or number of metric samples per fragment)",
    type: "int",
    required: true
  });

  parser.add_argument("--n-fragments-per-push-message", {
    help:
      "number of stream fragments to serialize into a single binary push message " +
      "(HTTP POST request body), mixed from different streams. Default: 1",
    type: "int",
    default: 1
  });

  parser.add_argument("--n-chars-per-msg", {
    help: "number of characters per log message (ignored in metrics mode)",
    type: "int",
    default: 100
  });

  // note: looking for a more expressive name
  parser.add_argument("--log-start-time", {
    help:
      "Timestamp of the first sample for all synthetic " +
      "log streams." +
      "ISO 8601 / RFC3339Nano (tz-aware), example: 2020-02-20T17:46:37.27000000Z. " +
      "Default: invocation time. Does not apply in metrics mode " +
      "(which is always guided by the current wall time)",
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
      "Maximum number of POST HTTP requests to perform concurrently. " +
      "Default: 0 (do as many as given by --n-concurrent-streams).",
    type: "int",
    default: 0
  });

  const readgroup = parser.add_mutually_exclusive_group();
  readgroup.add_argument("--max-concurrent-reads", {
    help:
      "Maximum number of GET HTTP requests to perform concurrently during " +
      "the read/validation phase. Default: 0 " +
      "(do as many as given by --n-concurrent-streams).",
    type: "int",
    default: 0
  });

  readgroup.add_argument("--skip-read", {
    help:
      "skip the readout in the write/read cycle, proceed to the next cycle instead",
    action: "store_true",
    default: false
  });

  // This must not be used with `--skip-read`, but it can be used with
  // --max-concurrent-reads. The `add_mutually_exclusive_group()` architecture
  // of argparse is not really the right way to solve this, also see
  // https://stackoverflow.com/a/60958103/145400 and
  // https://bugs.python.org/issue10984. Simply do ad-hoch manual validation
  // below. Caveat: the [ ... | ... ]- like notation in the auto-generated
  // help text will not be entirely correct.
  parser.add_argument("--read-n-streams-only", {
    help:
      "Maximum number of streams to read (validate) in the read phase of a " +
      "write/read cycle. Use this if you want to read (validate) less data " +
      "than what was written. The subset of streams is picked randomly at the " +
      "beginning of each read phase. Default: 0 " +
      "(read back everything that was written).",
    type: "int",
    default: 0
  });

  parser.add_argument("--compressability", {
    help:
      "compressability characteristic of generated log messages " +
      "(ignored in metrics mode)",
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

  // TODO: change: initialize the new streams with current wall time, and
  // consequentially make this incompatible with --log-start-time, then also
  // implement it so that and document that --log-start-time has no effect on
  // metrics mode, and document that in metrics mode the dummystream time
  // source is always wall time or inspired by walltime with regular skew sync.
  parser.add_argument("--change-streams-every-n-cycles", {
    help:
      "Use the same log/metric stream for N cycles, then create a new set of " +
      "streams (unique label sets). Default: new streams are created with every " +
      "write/read cycle. For log streams, when a new stream is initialized it " +
      "re-uses the same synthetic start time as set before (program invocation time " +
      "or log_start_time). Metric streams are always guided by wall time.",
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
    help:
      "HTTP server listen port (serves /metrics Prometheus endpoint). Default: try 8900-8990.",
    type: "int",
    default: 0
  });

  const stopgroup = parser.add_mutually_exclusive_group({ required: true });
  stopgroup.add_argument("--stream-write-n-fragments", {
    help:
      "within a write/read cycle, stop write (and enter read phase) when " +
      "this many fragments were written for a log/metric stream",
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
      "Maximum number of log entries to fetch per query during " +
      "read/validation phase (honored in metric mode? TODO)",

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
    default: 3
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
      "Read authentication token from file. Add header " +
      "`Authorization: Bearer <token>` to each HTTP request.",
    type: "str",
    default: ""
  });

  CFG = parser.parse_args();

  setLogger(
    buildLogger({
      stderrLevel: CFG.logLevel
    })
  );

  // const uniqueInvocationId = `looker-${START_TIME_EPOCH}-${rndstring(6)}`;
  const uniqueInvocationId = `looker-${rndstring(6)}`;
  CFG.invocation_id = uniqueInvocationId;

  if (CFG.log_start_time) {
    // validate input, let this blow up for now if input is invalid
    ZonedDateTime.parse(CFG.log_start_time);
    // In metrics mode, don't support this feature
    assert(!CFG.metrics_mode);
  } else {
    // Set default for log stream starttime: program invocation time.
    // Note: in metrics mode, this is never used; alway use the current
    // wall time upon DummyStream object initialization.
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

  if (CFG.skip_read && CFG.read_n_streams_only !== 0) {
    // see above, can't easily be covered by the mutually_exclusive_group
    // technique; this here is a cheap but at least quite helpful validation.
    log.error("skip_read must not be used with read_n_streams_only");
    process.exit(1);
  }

  if (CFG.read_n_streams_only > CFG.n_concurrent_streams) {
    log.error(
      "read_n_streams_only must not be larger than n_concurrent_streams"
    );
    process.exit(1);
  }

  log.info("rendered config:\n%s", JSON.stringify(CFG, null, 2));
}
