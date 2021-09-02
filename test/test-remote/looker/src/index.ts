#!/usr/bin/env node
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

import { ZonedDateTime, ZoneOffset } from "@js-joda/core";

import got, { Response as GotResponse } from "got";

import { Semaphore } from "await-semaphore";

import Denque from "denque";

import {
  LogSeries,
  LogSeriesFragmentPushRequest,
  LogSeriesFragment,
  LogSeriesFetchAndValidateOpts,
  LokiQueryResult
} from "./logs";

import {
  MetricSeries,
  MetricSeriesFragment,
  MetricSeriesFragmentPushMessage,
  MetricSeriesFetchAndValidateOpts
} from "./metrics";

import { LabelSet, WalltimeCouplingOptions } from "./series";

import {
  sleep,
  mtimeDiffSeconds,
  mtimeDeadlineInSeconds,
  mtime
} from "./mtime";

import { log } from "./log";

import * as util from "./util";

export const START_TIME_JODA = ZonedDateTime.now(ZoneOffset.UTC);
// const START_TIME_EPOCH = START_TIME_JODA.toEpochSecond();
const START_TIME_MONOTONIC = mtime();

import { parseCmdlineArgs, CFG, BEARER_TOKEN } from "./args";

import * as pm from "./prommetrics";

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

export const DEFAULT_LOG_LEVEL_STDERR = "info";

// only expose via CLI args if a good use case arises.
export let WALLTIME_COUPLING_PARAMS: WalltimeCouplingOptions;

let tooFastMsgLoggedLastTime = BigInt(0);

// let STATS_WRITE: WriteStats;
// let STATS_READ: ReadStats;

// these are set dynamically per-cycle.
let CYCLE_START_TIME_MONOTONIC: bigint;
let CYCLE_STOP_WRITE_AFTER_SECONDS: number;

// I didn't find a sane way to get the current value of a prometheus counter
// so this duplicates this as a global for internal things. Does not wrap,
// of course.
let COUNTER_STREAM_FRAGMENTS_PUSHED = BigInt(0);

let COUNTER_PUSHREQUEST_STATS_LOG_THROTTLE = 0;

// Prepare a mapping between series unique name and a count
let PER_STREAM_FRAGMENTS_CONSUMED_IN_CURRENT_CYCLE: Record<string, number> = {};

function setUptimeGauge() {
  // Set this in various places of the program visted regularly.
  const uptimeSeconds = mtimeDiffSeconds(START_TIME_MONOTONIC);
  pm.gauge_uptime.set(Math.round(uptimeSeconds));
}

async function main() {
  parseCmdlineArgs();
  const httpServerTerminator = pm.setupPromExporter();
  WALLTIME_COUPLING_PARAMS = calcWalltimeCouplingOptions();

  log.info("cycle 1: create a fresh set of time series");

  let series: Array<LogSeries | MetricSeries> = await createNewSeries(
    cycleId(1)
  );

  for (let cyclenum = 1; cyclenum <= CFG.n_cycles; cyclenum++) {
    // create a bit of visual separation between per-cycle log blobs.
    // `process.stderr.write()` might interleave unpredictably with rest of log
    // output.
    // log.info("cyclenum: %s", cyclenum);
    if (cyclenum > 1) {
      // log.info("\n\n\n");
      process.stderr.write("\n\n");
    }

    log.info("enter write/read cycle %s", cyclenum);
    setUptimeGauge();

    const cycleid = cycleId(cyclenum);
    if (cyclenum > 1) {
      if (
        CFG.change_series_every_n_cycles > 0 &&
        (cyclenum - 1) % CFG.change_series_every_n_cycles === 0
      ) {
        log.info(
          `cycle ${cyclenum}: fresh time series object(s) as ` +
            "of CFG.change_series_every_n_cycles"
        );
        series = await createNewSeries(cycleid);
      } else {
        log.info(
          "cycle %s: continue to use time series of previous cycle",
          cyclenum
        );
      }
    }
    pm.counter_rw_cycles.inc();

    try {
      await performWriteReadCycle(cyclenum, series, cycleid);
    } catch (err) {
      log.crit("err during write/read cycle: %s", err);
      process.exit(1);
    }
  }

  log.debug("shutting down http server");
  httpServerTerminator.terminate();
}

/**
 * Generate Cycle ID from cycle number `n`. `n` is 1, 2, 3, ...
 *
 * Return value is constant for constant `n`.
 *
 * The Cycle ID contains the invocation ID which contains quite a bit of
 * randomness.
 * @param n: the cycle number, an integer >= 1
 */
function cycleId(n: number) {
  // The idea is that `CFG.invocation_id` is unique among those looker
  // instances that interact with the same data ingest system.
  return `${CFG.invocation_id}-${n}`;
}

function calcFragmentTimeLeapSeconds(): number {
  let sample_time_increment_ns: number;
  if (CFG.metrics_mode) {
    sample_time_increment_ns = CFG.metrics_time_increment_ms * 1000;
  } else {
    sample_time_increment_ns = CFG.log_time_increment_ns;
  }

  // Fragment time leap, defined as the time difference between the last sample
  // of a fragment and the last sample of the previous fragment, equal to
  // (n_samples_per_series_fragment) * delta_t.
  const fragmentTimeLeapSeconds =
    CFG.n_samples_per_series_fragment * (sample_time_increment_ns / 10 ** 6);

  return fragmentTimeLeapSeconds;
}

function calcWalltimeCouplingOptions(): WalltimeCouplingOptions {
  const fragmentTimeLeapSeconds = calcFragmentTimeLeapSeconds();

  log.info(
    "walltime coupling: fragmentTimeLeapSeconds: " +
      `${fragmentTimeLeapSeconds.toFixed(2)} s`
  );

  // Why must maxLagSeconds depend on fragmentTimeLeapSconds? See
  // `TimeseriesBase.validateWtOpts()`.
  const minimalMaxLagSeconds = 5 * 60;
  const dynamicMaxLagSeconds = Math.ceil(fragmentTimeLeapSeconds * 5);
  let actualMaxLagSeconds;

  if (dynamicMaxLagSeconds < minimalMaxLagSeconds) {
    log.info(
      `walltime coupling: use minimal maxLagSeconds: ${minimalMaxLagSeconds}`
    );
    actualMaxLagSeconds = minimalMaxLagSeconds;
  } else {
    log.info(
      `walltime coupling: use dynamic maxLagSeconds: ${minimalMaxLagSeconds} ` +
        `(based on fragmentTimeLeapSeconds: ${fragmentTimeLeapSeconds.toFixed(
          2
        )} s)`
    );
    actualMaxLagSeconds = dynamicMaxLagSeconds;
  }

  return {
    maxLagSeconds: actualMaxLagSeconds,
    minLagSeconds: 1 * 60
  };
}

async function createNewSeries(
  invocationCycleId: string
): Promise<Array<LogSeries | MetricSeries>> {
  const series = [];

  log.info(`create ${CFG.n_series} time series objects`);

  if (CFG.additional_labels !== undefined) {
    log.info(
      "adding additional labels: %s",
      JSON.stringify(CFG.additional_labels)
    );
  }

  const now = ZonedDateTime.now();

  for (let i = 1; i < CFG.n_series + 1; i++) {
    const seriesname = `${invocationCycleId}-${i.toString()}`;

    const labelset: LabelSet = {};
    // add more labels (key/value pairs) as given by command line
    // without further validation
    if (CFG.additional_labels !== undefined) {
      // log.info(
      //   "adding additional labels: %s",
      //   JSON.stringify(CFG.additional_labels)
      // );
      for (const kvpair of CFG.additional_labels) {
        labelset[kvpair[0]] = kvpair[1];
      }
    }

    let s: MetricSeries | LogSeries;

    // Smear out the synthetic start time across individual time series, within
    // the 'green interval' [now-wcp.maxLagSeconds, now-wcp.minLagSeconds),
    // which is the interval of allowed timestamp values. At the boundaries of
    // that interval the walltime coupling correction mechanism hits in. As we
    // don't want these mechanisms to hit in right away, add a bit of leeway to
    // the left and right -- make the interval a little more narrow but cutting
    // a slice whose thickness depends on the time width of the series
    // fragments. Rely on the fact that the 'green interval' is at least 5
    // times as wide as a single time series fragment (in time). If the total
    // buffer is 3 times that then the regime to pick values from is as wide as
    // 2 ...
    const startTimeOffsetIntoPast = util.rndFloatFromInterval(
      WALLTIME_COUPLING_PARAMS.minLagSeconds +
        1.5 * calcFragmentTimeLeapSeconds(),
      WALLTIME_COUPLING_PARAMS.maxLagSeconds -
        1.5 * calcFragmentTimeLeapSeconds()
    );
    // const startTimeOffsetIntoPast = util.rndFloatFromInterval(
    //   WALLTIME_COUPLING_PARAMS.minLagSeconds + 5,
    //   WALLTIME_COUPLING_PARAMS.maxLagSeconds - 5
    // );

    const starttime = now.minusSeconds(startTimeOffsetIntoPast).withNano(0);

    if (CFG.metrics_mode) {
      // TODO some sort of adjustable cardinality here, where the number of
      // distinct label permutations across a series is configurable? (e.g. 10k
      // distinct labels across a series)
      s = new MetricSeries({
        // kept distinct across concurrent streams, see above TODO about sharing metric names
        // ensure any dashes in metric name are switched to underscores: required by prometheus
        // see also: https://prometheus.io/docs/concepts/data_model/#metric-names-and-labels
        metricName: seriesname.replace(/-/g, "_"),
        // must not collide among concurrent streams
        uniqueName: seriesname,
        n_samples_per_series_fragment: CFG.n_samples_per_series_fragment,
        starttime: starttime,
        // any check needed before doing this multiplication? would love to
        // have guarantee that the result is the sane integer that it needs
        // to be for the expected regime that users choose
        // `CFG.metrics_time_increment_ms` from.
        sample_time_increment_ns: CFG.metrics_time_increment_ms * 1000,
        labelset: labelset,
        wtopts: WALLTIME_COUPLING_PARAMS,
        counterForwardLeap: pm.counter_forward_leap
      });
    } else {
      // disable wall time coupling when --log-start-time has been set.
      let wtopts: WalltimeCouplingOptions | undefined =
        WALLTIME_COUPLING_PARAMS;
      let logstarttime: ZonedDateTime | undefined = starttime;
      if (CFG.log_start_time !== "") {
        log.info("wall time coupling disabled as of --log-start-time");
        wtopts = undefined;
        logstarttime = ZonedDateTime.parse(CFG.log_start_time);
      }

      s = new LogSeries({
        n_samples_per_series_fragment: CFG.n_samples_per_series_fragment,
        n_chars_per_msg: CFG.n_chars_per_msg,
        starttime: logstarttime,
        uniqueName: seriesname,
        sample_time_increment_ns: CFG.log_time_increment_ns,
        includeTimeInMsg: true,
        labelset: labelset,
        compressability: CFG.compressability,
        wtopts: wtopts
      });
    }

    const msg = `Initialized series: ${s}. Time of first sample: ${s.currentTimeRFC3339Nano()}`;

    const logEveryN = util.logEveryNcalc(CFG.n_series);
    if (i % logEveryN == 0) {
      log.info(msg + ` (${logEveryN - 1} msgs like this are/will be hidden)`);
      // Allow for more or less snappy SIGINTing this initialization step.
      await sleep(0.0001);
    } else {
      log.debug(msg);
    }
    series.push(s);
  }

  log.info("time series initialization finished");
  return series;
}

async function performWriteReadCycle(
  cyclenum: number,
  dummystreams: Array<LogSeries | MetricSeries>,
  invocationCycleId: string
) {
  CYCLE_START_TIME_MONOTONIC = mtime();
  CYCLE_STOP_WRITE_AFTER_SECONDS = CFG.stream_write_n_seconds;

  if (CFG.stream_write_n_seconds_jitter !== 0) {
    const jitter = util.rndFloatFromInterval(
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

  const dsLenthBeforeWrite = dummystreams.length;

  log.info("cycle %s: entering write phase", cyclenum);
  const writestats = await writePhase(dummystreams);

  // This is to protect against bugs in `writePhase()` where the `dummystreams`
  // array becomes accidentally mutated (had this before: dummystreams got
  // depopulated, read validation was happy in no time: 0 streams to validate)
  assert(dsLenthBeforeWrite === dummystreams.length);

  log.info("cycle %s: entering read phase", cyclenum);
  const readstats = await readPhase(dummystreams);

  const report = {
    argv: process.argv,
    renderedConfig: CFG,
    invocationTime: util.timestampToRFC3339Nano(START_TIME_JODA),
    cycleStats: {
      cycleNum: cyclenum,
      invocationCycleId: invocationCycleId,
      write: writestats,
      read: readstats
    }
  };
  log.debug("Report:\n%s", JSON.stringify(report, null, 2));
  const reportFilePath = `${invocationCycleId}.report.json`;
  fs.writeFileSync(reportFilePath, JSON.stringify(report, null, 2));
  log.info("wrote report to %s", reportFilePath);
}

async function writePhase(streams: Array<LogSeries | MetricSeries>) {
  const fragmentsPushedBefore = COUNTER_STREAM_FRAGMENTS_PUSHED;

  log.debug("reset per-series fragment push counter");
  PER_STREAM_FRAGMENTS_CONSUMED_IN_CURRENT_CYCLE = {};
  for (const s of streams) {
    PER_STREAM_FRAGMENTS_CONSUMED_IN_CURRENT_CYCLE[s.uniqueName] = 0;
  }

  const lt0 = mtime();

  // First, mark all streams so that (no) validation info is collected (to
  // override state from previous cycle, if the stream objects were carried
  // over from the previous cycle). Special case for --skip-read.
  if (CFG.skip_read) {
    log.info(
      "mark all streams to not keep track of validation info: --skip-read"
    );
    for (const s of streams) {
      s.disableValidation();
    }
  } else if (CFG.read_n_series_only === 0) {
    log.info(
      "mark all streams to keep track of validation info: no --skip-read, and no --read-n-streams-only"
    );
    for (const s of streams) {
      s.enableValidation();
    }
  }

  // Optimize for the case where there are many streams of which a small
  // fraction is supposed to be read-validated after the write phase. Only keep
  // record of the data that was written for that little fraction. I.eq., mark
  // most streams with a validation-info-not-needed flag, which reduces the
  // memory usage during the write phase.
  if (CFG.read_n_series_only !== 0) {
    // this implies that --skip-read is _not_ set.
    log.info(
      "mark all streams to not keep track of validation info: --read-n-streams-only is set"
    );
    for (const s of streams) {
      s.disableValidation();
    }

    log.info(
      "randomly marking %s/%s streams for validation",
      CFG.read_n_series_only,
      CFG.n_series
    );

    const streamsToValidate: Array<LogSeries | MetricSeries> =
      util.randomSampleFromArray(streams, CFG.read_n_series_only);

    // For a small selection, show the names of the streams, for debuggability
    if (CFG.read_n_series_only < 20) {
      const names = streamsToValidate.map(s => s.uniqueName).join(", ");
      log.info("selected: %s", names);
    }

    for (const s of streamsToValidate) {
      s.enableValidation();
    }
  }
  const labelForValidationDurationSeconds = mtimeDiffSeconds(lt0);

  // It's interesting to see how long these iterations took for millions of
  // streams.
  log.debug(
    "re-labeling series for validation info collection took %s s",
    labelForValidationDurationSeconds.toFixed(2)
  );

  // Now enter the actual write phase.
  const wt0 = mtime();
  await generateAndPostFragments(streams);
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
  const nEntriesSent = nStreamFragmentsSent * CFG.n_samples_per_series_fragment;
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
    "Payload write net throughput (mean): " +
      megaPayloadBytesSentPerSec.toFixed(5) +
      " million bytes per second (assumes utf8 for logs and 12+8 " +
      "bytes per sample for metrics)"
  );

  // for (const stream of streams) {
  //   log.debug(
  //     "Stats of last-consumed fragment of stream %s: %s",
  //     stream.uniqueName,
  //     stream.lastFragmentConsumed?.stats //currentTimeRFC3339Nano()
  //   );
  // }

  return stats;
}

async function throttledFetchAndValidate(
  semaphore: Semaphore,
  stream: LogSeries | MetricSeries
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
  } catch (err: any) {
    log.info("err in sem-protected, release, re-throw");
    release();
    throw err;
  }
  release();
  return fetchresult;
}

async function unthrottledFetchAndValidate(stream: LogSeries | MetricSeries) {
  // const inspectEveryNthEntry = 200;
  // const headers: Record<string, string> = {};
  // if (BEARER_TOKEN) {
  //   headers["Authorization"] = `Bearer ${BEARER_TOKEN}`;
  // }
  if (CFG.metrics_mode) {
    const opts: MetricSeriesFetchAndValidateOpts = {
      querierBaseUrl: CFG.apibaseurl,
      chunkSize: CFG.fetch_n_entries_per_query,
      customHTTPGetFunc: httpGETRetryUntil200OrError
    };
    return await stream.fetchAndValidate(opts);
  }
  const opts: LogSeriesFetchAndValidateOpts = {
    querierBaseUrl: CFG.apibaseurl,
    chunkSize: CFG.fetch_n_entries_per_query,
    // inspectEveryNthEntry: inspectEveryNthEntry,
    customLokiQueryFunc: queryLokiWithRetryOrError // only used by LogSeries.fetchAndValidate: has custom header injection
  };
  return await stream.fetchAndValidate(opts);
}

async function readPhase(streams: Array<LogSeries | MetricSeries>) {
  log.debug("entering read / validation phase");
  const validators = [];
  const vt0 = mtime();

  if (CFG.skip_read) {
    log.info("skipping readout as of --skip-read");
  } else {
    // Note that the 'sparse readout' where --skip-read is not set but
    // --read-n-streams-only is set is implemented per series object: the
    // validation method is effectively a noop for streams that were set to not
    // collect validation info. However, do not call functions where not
    // needed, that's why there is the `s.shouldBeValidated()`-based condition
    // Also, calling millions of noop functions does not work:
    // `RangeError: Too many elements passed to Promise.all`
    if (CFG.max_concurrent_reads === 0) {
      for (const s of streams) {
        if (s.shouldBeValidated()) {
          validators.push(unthrottledFetchAndValidate(s));
        }
      }
    } else {
      const semaphore = new Semaphore(CFG.max_concurrent_reads);
      for (const s of streams) {
        if (s.shouldBeValidated()) {
          validators.push(throttledFetchAndValidate(semaphore, s));
        }
      }
    }
  }

  // This code section must still be reached when using --skip-read, to
  // generate a 'correct' report, indicating that nothing was read.
  let nSamplesReadArr;
  try {
    // each validator returns the number of entries read (and validated)
    // TODO: a little it of progress report here would be nice.
    nSamplesReadArr = await Promise.all(validators);
  } catch (err: any) {
    log.crit("error during validation: %s", err);
    process.exit(1);
  }

  if (CFG.read_n_series_only !== 0) {
    log.debug("drop 'validation info' for all streams");
    for (const s of streams) {
      // Say there are 10^6 streams and we just read/validated a tiny fraction
      // of them, then there's a lot of data in memory (that would be needed to
      // to do read validation for all the other streams, which we know we
      // would not do). Assume that this is idempotent and fast. It is
      // important to do this _after_ `await Promise.all(validators)` above, so
      // that we do not pull validation info underneath validator methods that
      // need them.
      // TODO: might not be needed if in the beginning of the cycle things
      // are properly set up
      s.dropValidationInfo();
    }
  }

  const nSamplesRead = nSamplesReadArr.reduce((a, b) => a + b, 0);
  //log.info("nSamplesReadArr sum: %s", nSamplesRead);

  const readDurationSeconds = mtimeDiffSeconds(vt0);
  log.info(
    `validation (read) took ${readDurationSeconds.toFixed(1)} s overall. ` +
      `${nSamplesRead} samples read across ${validators.length} series (` +
      `${nSamplesRead / validators.length} per series).`
  );

  // assume that exact payload was read as previously sent for now
  // TODO: build these stats on the fly during readout and expect numbers
  // to match write?
  //const nSamplesRead = STATS_WRITE.nEntriesSent;
  let nPayloadBytesRead = nSamplesRead * CFG.n_chars_per_msg;

  if (CFG.metrics_mode) {
    // 64 bit floating point, i.e. 8 bytes per sample
    nPayloadBytesRead = nSamplesRead * 8;
  }

  const megaPayloadBytesRead = nPayloadBytesRead / 10 ** 6;

  const stats: ReadStats = {
    nEntriesRead: nSamplesRead,
    nPayloadBytesRead: nPayloadBytesRead,
    entriesReadPerSec: nSamplesRead / readDurationSeconds,
    megaPayloadBytesReadPerSec: megaPayloadBytesRead / readDurationSeconds,
    durationSeconds: readDurationSeconds
  };
  return stats;
}

/*
This function is the core of the write phase within a cycle.

For each series, send all fragments (until intra-cycle stop criterion is hit).

A "push request" or "push message" is a Prometheus term for a
(snappy-compressed) protobuf message carrying log/metric payload data.

If `CFG.n_fragments_per_push_message` is larger than 1 then this
means that each push message is supposed to contain data from that many time
series.
*/
export async function generateAndPostFragments(
  series: Array<LogSeries | MetricSeries>
): Promise<void> {
  const actors = [];

  // `CFG.max_concurrent_writes` is at most `N_concurrent_streams`.
  // N_concurrent_streams may be up to O(10**6).
  //
  // The main activity within an
  // actor is to do this in a loop:
  //
  // - generate one or more time series fragments
  // - serialize this/these fragment(s) into a binary push messages
  // - send that message out via an HTTP POST request

  // We do not want to mutate the original `series` Array -- which of the
  // following two techniques fulfills that? Both?
  const seriespool = new Denque([...series]);
  //const seriespool = new Denque(series);

  log.debug(`seriespool.length: ${seriespool.length}`);

  const actorCount = CFG.max_concurrent_writes;
  for (let i = 1; i <= actorCount; i++) {
    actors.push(
      produceAndPOSTpushrequestsUntilCycleStopCriterion(
        seriespool,
        CFG.n_fragments_per_push_message,
        actorCount,
        i
      )
    );
  }

  await Promise.all(actors);
}

/**
 * Get at most N fragments from series pool.
 *
 * Invariant: get at most one fragment per series.
 *
 * If the series pool doesn't have N fragments ready to be consumed then the
 * returned number may be 0 or any number less than N.
 *
 * This only returns less than N for boundary effects, towards 'end of work'.
 *
 * As of the way the concurrent actors operate on `seriespool` this might
 * return a set of fragments with varying 'generation' across fragments, i.e.
 * one fragment is the Mth one from a time series, and another fragment is the
 * Pth one from another time series with M != P.
 *
 * (before this, looker once had a concurrency architecture that ensured that
 * _all_ first-generation fragments get pushed before moving on to generating
 * second-generation fragments, and so on.)
 *
 * The sorting order of time series objects on the series pool may vary and get
 * more and more random over time when there is a lot of work to do, as of the
 * unpredictable timing of HTTP requests -- that is why certain time series
 * objects may after all be processed faster than others. Over time, this may
 * create an interesting distribution of 'progress' for each time series.
 *
 * @param seriespool
 * @param nf: desired number of fragments
 * @param actorCount
 * @param actorIndex
 * @returns
 */
async function tryToGetNFragmentsFromSeriesPool(
  seriespool: Denque<LogSeries | MetricSeries>,
  nf: number,
  actorCount: number, // total number of actors
  actorIndex: number // representing the actor as part of which this func runs
): Promise<Array<LogSeriesFragment | MetricSeriesFragment>> {
  const fragments: Array<LogSeriesFragment | MetricSeriesFragment> = [];

  // candidate-popping loop: try to acquire at most `nf` fragments (all from
  // different series) from the pool (not every candidate might have one
  // ready!)

  let candidatesPoppedSinceLastFragmentGenerated = 0;
  while (true) {
    // Look at a candidate: pop off item from the end of the queue.
    const s = seriespool.pop();
    candidatesPoppedSinceLastFragmentGenerated += 1;

    if (s === undefined) {
      log.info(
        `write actor ${actorIndex}: series pool is empty. generated ${fragments.length} fragments (desired: ${nf})`
      );
      // Break from the loop. At this point, the `fragments` array may
      // be of length between 0 or nf-1.
      return fragments;
    }

    let fragment: MetricSeriesFragment | LogSeriesFragment | undefined =
      undefined;

    // This while loop is effectively implementing the throttling mechanism
    // when synthetic time moves too fast.
    let histobserved = false;

    // lazy-throttling loop: once the pool is small, keep an eye on the
    // individual candidate, periodically, via this loop. When there's still
    // work on the pool never spend more than one iteration in here.
    while (true) {
      const [shiftIntoPastSeconds, f] = s.generateNextFragmentOrSkip();

      // If `f` was freshly generated (no throttling) then rely on
      // `shiftIntoPastSeconds` to represent the last sample of that fresh
      // fragment. If `f` is `undefined` then rely on this value to represent
      // the last sample of the last generated fragment. Only observe this once
      // in this current loop here to not skew the histogram. (maybe it's
      // better to decouple that and do this elsewhere).
      if (!histobserved) {
        pm.hist_lag_compared_to_wall_time.observe(shiftIntoPastSeconds);
        histobserved = true;
      }

      if (f !== undefined) {
        // A fragment was generated from `s`. Leave this lazy-throttling loop.
        fragment = f;
        candidatesPoppedSinceLastFragmentGenerated = 0;
        break;
      }

      // `s` was not ready. Info-log this fact, but only once per N seconds (to
      // keep some progress report here; this might take many minutes w/o
      // generating log output otherwise).
      if (mtimeDiffSeconds(tooFastMsgLoggedLastTime) > 10) {
        const shiftIntoPastMinutes = shiftIntoPastSeconds / 60;
        log.info(
          `write actor ${actorIndex}: ${s}: current lag compared to wall time is ${shiftIntoPastMinutes.toFixed(
            1
          )} minutes. Sample generation is too fast. Delay generating ` +
            "and pushing the next fragment. This may take up to " +
            `${(s.fragmentTimeLeapSeconds / 60.0).toFixed(1)} minutes, ` +
            "the time width of a series fragment. " +
            "(not logged for every case)"
        );
        tooFastMsgLoggedLastTime = mtime();
      }
      pm.counter_fragment_generation_delayed.inc(1);

      if (candidatesPoppedSinceLastFragmentGenerated >= CFG.n_series) {
        // We looked at least as many time series as there are and none of them
        // had a fragment ready. Example: just one actor and two series, and
        // none of these two series will have a fragment ready within the next
        // five minutes of wall time. Then do not busy-spin in this loop (the
        // candidate-popping loop) by constantly popping one of those series
        // off the work pool and immediately putting it back, immediately
        // proceeding with the next. Add a tiny sleep in this case per
        // candidate-popping loop iteration. This allows for CTRL+C ing quickly
        // in this scenario and changes the average CPU utilization from ~100 %
        // to ~0 %.
        await sleep(0.5);
      }

      // If there's still a bunch of other candidates in the pool then put the
      // current candidate back and pick another one. Else, start polling loop
      // and watch the current candidate.
      const ql = seriespool.length;
      if (ql <= actorCount - 1) {
        // There is as much work left in the pool as other actors are there
        // or less work than that. Don't put the current candidate back into
        // the pool. Observe it.
        log.debug(
          `write actor ${actorIndex}: actors are running out of work ` +
            `(queue length: ${ql}): idle-watch candidate`
        );
        await sleep(5);
        continue;
      }

      // There's still work in the pool (candidates to look at before other
      // actors will). Put this candidate back onto the queue (left-hand
      // side). Since this is a double-ended queue implementation this
      // operation is of constant time complexity (O(1)).
      seriespool.unshift(s);

      // Leave this lazy-throttling loop, meaning that `fragment` is
      // `undefined`.
      break;
    }

    if (fragment === undefined) {
      // That means that the current candidate `s` did not have a fragment
      // ready and that it has been put back into the pool. Get a new candidate
      // from the pool.
      continue;
    }

    fragments.push(fragment);
    s.lastFragmentConsumed = fragment;
    // Book-keeping for stop-criterion
    PER_STREAM_FRAGMENTS_CONSUMED_IN_CURRENT_CYCLE[s.uniqueName] += 1;

    if (fragments.length === nf) {
      log.debug(`seriespool.length: ${seriespool.length}`);
      log.debug(`write actor ${actorIndex}: collected ${nf} fragments`);
      return fragments;
    }
  }
}

async function produceAndPOSTpushrequestsUntilCycleStopCriterion(
  seriespool: Denque<LogSeries | MetricSeries>,
  nfppm: number,
  actorCount: number,
  actorIndex: number
) {
  // Repetitively call into tryToGetNFragmentsFromSeriesPool() precisely until
  // no fragments are returned anymore.
  while (true) {
    const fragments = await tryToGetNFragmentsFromSeriesPool(
      seriespool,
      nfppm,
      actorCount,
      actorIndex
    );

    if (fragments.length === 0) {
      log.info(
        `write actor ${actorIndex}: candidate-popping loop terminated, no fragment acquired: all work done, exit actor.`
      );
      return;
    }

    await _postFragments(fragments, actorIndex);

    // implement intra-cycle stop criteria
    if (CYCLE_STOP_WRITE_AFTER_SECONDS !== 0) {
      const secondsSinceCycleStart = mtimeDiffSeconds(
        CYCLE_START_TIME_MONOTONIC
      );
      if (secondsSinceCycleStart > CYCLE_STOP_WRITE_AFTER_SECONDS) {
        log.debug(
          `write actor ${actorIndex}: ${secondsSinceCycleStart.toFixed(
            2
          )} seconds passed: stop producer`
        );
        return;
      }
    }

    // For each of the fragments pushed there is a corresponding series object
    // that maybe needs to be put back onto the work pool (it's important to
    // only do that now after the push message has been sent out)
    for (const f of fragments) {
      const s = f.parent!;
      if (
        PER_STREAM_FRAGMENTS_CONSUMED_IN_CURRENT_CYCLE[s.uniqueName] <
        CFG.stream_write_n_fragments
      ) {
        // Put back into work pool (left-hand side). All other actors might
        // have terminated by now because maybe temporarily the pool size
        // appeared as 0 (and in fact, was). Now that _this actor here_ is
        // adding back items onto the pool, we also have to make sure that this
        // actor here performs one more outer loop interation.
        seriespool.unshift(s);
        log.debug(`put ${s.uniqueName} back into work queue`);
      } else {
        log.debug(
          `write actor ${actorIndex}:  CFG.stream_write_n_fragments (${CFG.stream_write_n_fragments}) ` +
            `pushed for ${s.uniqueName}`
        );
      }
    }
  }
}

async function _postFragments(
  fragments: Array<LogSeriesFragment | MetricSeriesFragment>,
  actorIndex: number
) {
  const t0 = mtime();
  let pr: LogSeriesFragmentPushRequest | MetricSeriesFragmentPushMessage;
  if (CFG.metrics_mode) {
    pr = new MetricSeriesFragmentPushMessage(
      fragments as MetricSeriesFragment[]
    );
  } else {
    pr = new LogSeriesFragmentPushRequest(fragments as LogSeriesFragment[]);
  }
  const genduration = mtimeDiffSeconds(t0);

  // the compiler thinks that this can be `undefined` as of the [0] -- but
  // it's confirmed (above) that this array is not empty.
  const firstseries = fragments[0].parent as LogSeries | MetricSeries;
  const fcount = fragments.length;
  const name =
    `write actor ${actorIndex}: _postFragments((nstreams=${fcount}, ` +
    `first=${firstseries.promQueryString()})`;

  if (
    COUNTER_PUSHREQUEST_STATS_LOG_THROTTLE < 1 ||
    COUNTER_PUSHREQUEST_STATS_LOG_THROTTLE % 200 == 0
  ) {
    const firstFragment = pr.fragments[0];
    const lastFragment = pr.fragments.slice(-1)[0];
    log.info(
      `${name}: generated pushrequest msg in ${genduration.toFixed(
        2
      )} s with ` +
        `${fcount} series ` +
        `(first: ${
          firstFragment.parent?.uniqueName
        }, index ${firstFragment.indexString(3)} -- ` +
        `last: ${
          lastFragment.parent?.uniqueName
        }, index ${lastFragment.indexString(3)}), ` +
        `size: ${pr.dataLengthMiB.toFixed(4)} MiB). ` +
        "POST it (not logged for every case)."
    );
  }
  COUNTER_PUSHREQUEST_STATS_LOG_THROTTLE++;

  const postT0 = mtime();
  try {
    // Do not use pr.postWithRetryOrError() which is super simple,
    // but use a custom function with CLI arg-controlled retrying
    // parameters etc.
    await customPostWithRetryOrError(pr, CFG.apibaseurl);
  } catch (err: any) {
    log.crit("consider critical: %s", err);
    process.exit(1);
  }

  const postDurationSeconds = mtimeDiffSeconds(postT0);
  pm.hist_duration_post_with_retry_seconds.observe(postDurationSeconds);

  COUNTER_STREAM_FRAGMENTS_PUSHED =
    COUNTER_STREAM_FRAGMENTS_PUSHED + BigInt(fcount);

  pm.counter_fragments_pushed.inc(fcount);

  pm.counter_log_entries_pushed.inc(CFG.n_samples_per_series_fragment * fcount);

  // NOTE: payloadByteCount() includes timestamps. For logs, the timestamp
  // payload data (12 bytes per entry) might be small compared to the log
  // entry data. For metrics, the timestamp data is _larger than_ the
  // numerical sample data (8 bytes per sample).

  // Convert BigInt to Number and assume that the numbers are small enough
  pm.counter_payload_bytes_pushed.inc(Number(pr.payloadByteCount));
  pm.counter_serialized_fragments_bytes_pushed.inc(pr.dataLengthBytes);
  pm.gauge_last_http_request_body_size_bytes.set(pr.dataLengthBytes);
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
  const jitter = util.rndFloatFromInterval(
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
  pr: LogSeriesFragmentPushRequest | MetricSeriesFragmentPushMessage,
  baseUrl: string
) {
  const deadline = mtimeDeadlineInSeconds(CFG.retry_post_deadline_seconds);
  let attempt = 0;

  // There are HTTP responses that indicate a problem in the receiving end, but
  // the insert of the data may nevertheless have succeeded. Typical
  // distributed systems problem. Keep note of that, so that a subsequent push
  // retry which fails with '400 out of order' is _not_ fatal.
  let previousPushSuccessAmbiguous = false;

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
    } catch (e: any) {
      if (e instanceof got.RequestError) {
        // Note(JP): this code block is meant to handle only transient errors
        // (TCP conn errors/ timeout errors). I do hope that `e instanceof
        // got.RequestError` is not too specific, we will see.

        // Reflect this transient error in Prom counter. We could add a stream
        // name label here so that this error is associated with a specific
        // dummystream.
        pm.counter_post_non_http_errors.inc();

        // Example log message: `POST
        // PushRequest(md5=434f0758a5df51275ba0f188ab9b07a2): attempt 1 failed
        // with: socket hang up`
        log.warning(
          `POST ${pr}: attempt ${attempt}: transient problem: ${e.message}`
        );
        // Move on to next attempt.
        continue;

        // Note that the request might have been written successfully and maybe
        // we're missing a success response because of an unfortunate TCP
        // connection breakdown. In this case, the write was successful but we
        // didn't receive the confirmation. We would land in here AFAIU, in the
        // `RequestError` handler and _could_ set
        // `previousPushSuccessAmbiguous` so that a subsequent 'out of order'
        // error wouldn't be fatal. But this should be done so that it's clear
        // that the request was actually written. Should be detectable, can
        // look into that later.
      } else {
        // Assume that this is a programming error, let program crash.
        throw e;
      }
    }

    // Rely on that when we're here that we actually got an HTTP response, i.e.
    // a status code is known.
    pm.counter_post_responses.inc({ statuscode: response.statusCode });

    if ([200, 204].includes(response.statusCode)) {
      util.logHTTPResponseLight(response, `${pr}`);
      markPushMessageAsSuccessfullySent(pr);
      return;
    }

    if (response.statusCode === 429) {
      log.info(
        `POST ${pr}: 429 resp, sleep 2, body[:200]: ${response.body.slice(
          0,
          200
        )}`
      );
      // Move on to next attempt.
      continue;
    }

    // We got an HTTP response that reveals a request error or a transient
    // problem. We want to learn as much as we can about both: log HTTP
    // response in more detail.
    util.logHTTPResponse(response, `${pr}`);

    // Handle 4xx responses (most likely permanent errors with the request)
    if (response.statusCode.toString().startsWith("4")) {
      // Special-case treatment of out-of-order err after ambiguous previous push
      if (response.statusCode === 400) {
        if (response.body.includes("out of order sample")) {
          if (previousPushSuccessAmbiguous) {
            log.warning(
              "POST %s: saw 'out of order' error but do not treat fatal as of previous ambiguous push result",
              pr
            );
            // Treat this push message as successfully inserted.
            markPushMessageAsSuccessfullySent(pr);
            return;
          }
        }
      }

      throw new Error(`POST ${pr}: Bad HTTP request (see log above)`);
    }

    if (response.statusCode === 500) {
      // Note(JP): this is a real-world example I have seen where the receiving
      // system internally generated a 'DeadlineExceeded' error and wrapped it
      // into a 500 response -- the next push retry then failed with a 400 out
      // of order error.
      const needles = [
        "DeadlineExceeded",
        "code = Unavailable desc = transport is closing"
      ];
      for (const n in needles) {
        if (response.body.includes(n)) {
          previousPushSuccessAmbiguous = true;
          log.warning(
            `POST ${pr}: previousPushSuccessAmbiguous: set as of a` +
              `500(${n}) response, next 'out or order' error not fatal`
          );
        }
      }
    }

    // All other HTTP responses: treat as transient problems
    log.info("POST %s: Treat as transient problem, retry after sleep", pr);
  }
}

// should this be a method on the class?
function markPushMessageAsSuccessfullySent(
  pr: LogSeriesFragmentPushRequest | MetricSeriesFragmentPushMessage
) {
  // Keep track of the fact that this was successfully pushed out,
  // important for e.g. read-based validation after write.

  // Plan for this push request to contain potentially more than one
  // time series (metrics or logs).
  for (const frgmnt of pr.fragments) {
    // dummystream version
    // also works for dummyseries but is noop
    frgmnt.parent!.nFragmentsSuccessfullySentSinceLastValidate += 1;

    // drop actual samples (otherwise mem usage would grow quite fast).
    frgmnt.buildStatisticsAndDropData();

    // dummyseries version
    if (frgmnt instanceof MetricSeriesFragment) {
      // `postedFragmentsSinceLastValidate` is an array if this object is meant
      // to collect information for read-validation, or `undefined` otherwise.
      if (frgmnt.parent!.postedFragmentsSinceLastValidate !== undefined) {
        frgmnt.parent!.postedFragmentsSinceLastValidate.push(frgmnt);
      }
    }
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
    } catch (e: any) {
      if (e instanceof got.RequestError) {
        // Note(JP): this code block is meant to handle only transient errors
        // (TCP conn errors/ timeout errors). I do hope that `e instanceof
        // got.RequestError` is not too specific, we will see.

        // Reflect this transient error in Prom counter. We could add a stream
        // name label here so that this error is associated with a specific
        // dummystream.
        pm.counter_get_non_http_errors.inc();

        log.warning(
          `Query: attempt ${attempt}/${maxRetries} failed with ${e.message}`
        );

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
    pm.counter_get_responses.inc({ statuscode: response.statusCode });

    if (response.statusCode === 200) {
      util.logHTTPResponseLight(response);
      // In the corresponding LogSeries object keep track of the fact that
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
    util.logHTTPResponse(response);

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
  additionalHeaders: Record<string, string>,
  queryParams: Record<string, string>,
  expectedEntryCount: number,
  chunkIndex: number,
  stream: LogSeries
): Promise<LokiQueryResult> {
  log.debug("looker-specific query func");

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
      timeout: util.httpTimeoutSettings,
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
    } catch (err: any) {
      pm.counter_unexpected_query_results.inc();
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
      // is a backpressure or networking issue, fail fast in that case.
      connect: 12000,
      request: 60000
    }
  });
  return response;
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
