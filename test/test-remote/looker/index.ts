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

import { strict as assert } from "assert";

import { ZonedDateTime, ZoneOffset } from "@js-joda/core";

import got, { Response as GotResponse } from "got";

import { Semaphore } from "await-semaphore";

import {
  DummyStream,
  LogStreamFragmentPushRequest,
  LogStreamLabelset,
  LogStreamFragment,
  DummyStreamFetchAndValidateOpts
} from "./logs";

import {
  DummyTimeseries,
  TimeseriesFragment,
  TimeseriesFragmentPushMessage,
  DummyTimeseriesFetchAndValidateOpts
} from "./metrics";

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

function setUptimeGauge() {
  // Set this in various places of the program visted regularly.
  const uptimeSeconds = mtimeDiffSeconds(START_TIME_MONOTONIC);
  pm.gauge_uptime.set(Math.round(uptimeSeconds));
}

async function main() {
  parseCmdlineArgs();
  const httpServerTerminator = pm.setupPromExporter();

  //let dummystreams: Array<DummyStream>;
  let dummystreams: Array<DummyStream | DummyTimeseries>;

  for (let cyclenum = 1; cyclenum < CFG.n_cycles + 1; cyclenum++) {
    setUptimeGauge();

    const numString = `${cyclenum.toString().padStart(3, "0")}`;
    const guniqueCycleId = `${CFG.invocation_id}-${numString}-${rndstring(4)}`;

    log.info("enter write/read cycle  %s", cyclenum);

    if ((cyclenum - 1) % CFG.change_streams_every_n_cycles === 0) {
      // rely on cyclenum to start at 1, 0 % N is 0 so that in the first
      // run some dummystreams are created!
      log.info("cycle %s: create new dummystreams", cyclenum);
      dummystreams = await createNewDummyStreams(guniqueCycleId);
    } else {
      log.info(
        "cycle %s: continue to use dummystreams of previous cycle",
        cyclenum
      );
    }

    pm.counter_rw_cycles.inc();

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

async function createNewDummyStreams(
  guniqueCycleId: string
): Promise<Array<DummyStream | DummyTimeseries>> {
  const streams = [];

  for (let i = 1; i < CFG.n_concurrent_streams + 1; i++) {
    // do not pad, might save some memory
    const streamname = `${guniqueCycleId}-${i.toString()}`; //.padStart(3, "0")}`;

    // by default attach one label to the stream
    const labelset: LogStreamLabelset = {
      //  streamname: streamname
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
      stream = new DummyTimeseries(
        {
          metricName: `looker_${rndstring(4)}`, // might collide among streams, which is OK as long as the label set adds uniqueness
          uniqueName: streamname, // must not collide among streams
          n_samples_per_series_fragment: CFG.n_entries_per_stream_fragment,

          // With Cortex' Blocks Storage system, we cannot go into the future
          // compared to "now" (from Cortex' system time point of view), but we
          // also cannot fall behind for more than 60 minutes, see
          // https://github.com/cortexproject/cortex/issues/2366. That means that
          // the wall time passed after DummyTimeseries initialization matters.
          // How exactly it matters depends on the synthetically created time
          // difference between adjacent metric samples and the push rate. Use
          // the one hour leeway that we have here in a 'smart' way; let each
          // DummyTimeseries start in the _center_ of the timewindow, i.e 30
          // minutes in the past compared to "now", where "now" really is
          // DummyTimeseries() initialization: use wall time as start time, so
          // that when generating new streams during runtime (from cycle to
          // cycle) that we don't keep going back to using the program's
          // invocation time, as is done for logs (where Loki accepts incoming
          // data from far in the past),

          // Set start time to a time between now-30min and now-20min - -smear
          // this out by plus/minus 5 minutes, because of the throttling
          // mechanism otherwise hitting in for all series at the same time.
          // Note that Math.random() returns [0,1) (not including 1).
          starttime: ZonedDateTime.now()
            .minusMinutes(25 + 10 * (Math.random() - 0.5))
            .withNano(0),
          timediffMilliSeconds: CFG.metrics_time_increment_ms,
          labelset: labelset
        },
        pm.counter_forward_leap
      );
    } else {
      stream = new DummyStream({
        n_entries_per_stream_fragment: CFG.n_entries_per_stream_fragment,
        n_chars_per_message: CFG.n_chars_per_msg,
        starttime: ZonedDateTime.parse(CFG.log_start_time),
        uniqueName: streamname,
        timediffNanoseconds: CFG.log_time_increment_ns,
        includeTimeInMsg: true,
        labelset: labelset,
        compressability: CFG.compressability
      });
    }

    const msg = `Initialized series: ${stream}. Time of first sample: ${stream.currentTimeRFC3339Nano()}`;

    const logEveryN = util.logEveryNcalc(CFG.n_concurrent_streams);
    if (i % logEveryN == 0) {
      log.info(msg + ` (${logEveryN - 1} msgs like this hidden)`);
      // Allow for more or less snappy SIGINTing this initialization step.
      await sleep(0.0001);
    } else {
      log.debug(msg);
    }
    streams.push(stream);
  }

  log.info("stream initialization finished");
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
  } else if (CFG.read_n_streams_only === 0) {
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
  if (CFG.read_n_streams_only !== 0) {
    // this implies that --skip-read is _not_ set.
    log.info(
      "mark all streams to not keep track of validation info: --read-n-streams-only is set"
    );
    for (const s of streams) {
      s.disableValidation();
    }

    log.info(
      "randomly marking %s/%s streams for validation",
      CFG.read_n_streams_only,
      CFG.n_concurrent_streams
    );

    const streamsToValidate: Array<
      DummyStream | DummyTimeseries
    > = util.randomSampleFromArray(streams, CFG.read_n_streams_only);

    // For a small selection, show the names of the streams, for debuggability
    if (CFG.read_n_streams_only < 20) {
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
  log.info(
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
    "Payload write net throughput (mean): %s million bytes per second (assumes utf8 for logs and 12+8 Bytes per sample for metrics)",
    megaPayloadBytesSentPerSec.toFixed(2)
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

async function readPhase(streams: Array<DummyStream | DummyTimeseries>) {
  log.info("entering read / validation phase");
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
        validators.push(throttledFetchAndValidate(semaphore, s));
      }
    }
  }

  // This code section must still be reached when using --skip-read, to
  // generate a 'correct' report, indicating that nothing was read.
  let nEntriesReadArr;
  try {
    // each validator returns the number of entries read (and validated)
    // TODO: a little it of progress report here would be nice.
    nEntriesReadArr = await Promise.all(validators);
  } catch (err) {
    log.crit("error during validation: %s", err);
    process.exit(1);
  }

  if (CFG.read_n_streams_only !== 0) {
    log.info("drop 'validation info' for all streams");
    for (const s of streams) {
      // Say there are 10^6 streams and we just read/validated a tiny fraction
      // of them, then there's a lot of data in memory (that would be needed to
      // to do read validation for all the other streams, which we know we
      // would not do). Assume that this is idempotent and fast. It is
      // important to do this _after_ `await Promise.all(validators)` above, so
      // that we do not pull validation info underneath validator methods that
      // need them.
      s.dropValidationInfo();
    }
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
export async function generateAndPostFragments(
  streams: Array<DummyStream | DummyTimeseries>
): Promise<void> {
  const actors = [];

  const writeConcurSemaphore = new Semaphore(CFG.max_concurrent_writes);

  // Create N_concurrent_streams (think: upper bound towards 10**5 or 10**6?)
  // actors, but throttle their main activity (fragment generation and
  // serialization) to N_concurrent_writes (think: upper bound between 10**2
  // and 10**3).
  log.info(
    "create %s pushrequestProducerAndPOSTer()",
    CFG.n_concurrent_streams
  );

  //const N_STREAM_FRAGMENTS_PER_PUSH_REQUEST = 80;
  const streamChunks = util.chunkify<DummyStream | DummyTimeseries>(
    streams,
    CFG.n_fragments_per_push_message
  );

  for (const sc of streamChunks) {
    // new concept: N streams per pushrequestproducernadPOSTer
    actors.push(pushrequestProducerAndPOSTer(sc, writeConcurSemaphore));
  }

  await Promise.all(actors);
}

// Part of the body of the while(true) {} main loop of
// pushrequestProducerAndPOSTer().
async function _produceAndPOSTpushrequest(
  streams: Array<DummyStream | DummyTimeseries>,
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
    const fragments: Array<LogStreamFragment | TimeseriesFragment> = [];

    //
    if (!CFG.metrics_mode)
      for (const s of streams as DummyStream[]) {
        const f = s.generateAndGetNextFragment();
        fragments.push(f);
        s.lastFragmentConsumed = f;
      }
    else {
      for (const s of streams as DummyTimeseries[]) {
        let fragment: TimeseriesFragment;

        // This while loop is effectively a throttling mechanism, only
        // built for metrics mode.
        while (true) {
          const [shiftIntoPastSeconds, f] = s.generateAndGetNextFragment();
          if (f !== undefined) {
            // TODO: the current time shift compared to wall time should
            // be monitored, maybe via a histogram? Does not make sense
            // to update a gauge with it because the shift is a distribution
            // over _all_ streams in this looker session, might might be
            // O(10^6).
            fragment = f;
            break;
          }

          const shiftIntoPastMinutes = shiftIntoPastSeconds / 60;
          log.debug(
            `${s}: current lag compared to wall time is ${shiftIntoPastMinutes.toFixed(
              1
            )} minutes. Sample generation is too fast. Delay generating ` +
              "and pushing the next fragment. This may take up to 10 minutes."
          );
          // We want to monitor the artificial throttling
          pm.counter_fragment_generation_delayed.inc(1);
          await sleep(10);
        }

        fragments.push(fragment);
        s.lastFragmentConsumed = fragment;
      }
    }

    // NOTE(JP): here we can calculate the lag between the first or last sample
    // in the fragment and the actual wall time. Matters a lot for metrics
    // mode! Can be used to log it for starters, to let a human decide to
    // change parameters. Can also be used to auto-correct things (in a way
    // that allows for read validation, i.e. allowing for calculation of sample
    // timestamps w/o keeping all data that was written).

    const t0 = mtime();

    let pr: LogStreamFragmentPushRequest | TimeseriesFragmentPushMessage;

    if (streams[0] instanceof DummyTimeseries) {
      pr = new TimeseriesFragmentPushMessage(fragments as TimeseriesFragment[]);
    } else {
      pr = new LogStreamFragmentPushRequest(fragments as LogStreamFragment[]);
    }

    //const pushrequest = fragment.serialize(); //toPushrequest();
    const genduration = mtimeDiffSeconds(t0);

    //const pr = pushrequest;
    let name: string;
    if (streams.length === 1) {
      name = `prProducerPOSTer(${streams[0].promQueryString()})`;
    } else {
      name = `prProducerPOSTer(nstreams=${
        streams.length
      }, first=${streams[0].promQueryString()})`;
    }

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
          `${pr.fragments.length} series ` +
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
    } catch (err) {
      log.crit("consider critical: %s", err);
      process.exit(1);
    }

    const postDurationSeconds = mtimeDiffSeconds(postT0);
    pm.hist_duration_post_with_retry_seconds.observe(postDurationSeconds);

    COUNTER_STREAM_FRAGMENTS_PUSHED =
      COUNTER_STREAM_FRAGMENTS_PUSHED +
      BigInt(CFG.n_fragments_per_push_message);

    pm.counter_fragments_pushed.inc(CFG.n_fragments_per_push_message);

    pm.counter_log_entries_pushed.inc(
      CFG.n_entries_per_stream_fragment * CFG.n_fragments_per_push_message
    );

    // NOTE: payloadByteCount() includes timestamps. For logs, the timestamp
    // payload data (12 bytes per entry) might be small compared to the log
    // entry data. For metrics, the timestamp data is _larger than_ the
    // numerical sample data (8 bytes per sample).

    // Convert BigInt to Number and assume that the numbers are small enough
    pm.counter_payload_bytes_pushed.inc(Number(pr.payloadByteCount));
    pm.counter_serialized_fragments_bytes_pushed.inc(pr.dataLengthBytes);
    pm.gauge_last_http_request_body_size_bytes.set(pr.dataLengthBytes);
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
  streams: Array<DummyStream | DummyTimeseries>,
  semaphore: Semaphore
) {
  let fragmentsPushed = 0;

  let name: string;
  if (streams.length === 1) {
    name = streams[0].uniqueName;
  } else {
    name = `nstreams=${streams.length},first=${streams[0].uniqueName}`;
  }
  while (true) {
    if (CYCLE_STOP_WRITE_AFTER_SECONDS !== 0) {
      const secondsSinceCycleStart = mtimeDiffSeconds(
        CYCLE_START_TIME_MONOTONIC
      );
      if (secondsSinceCycleStart > CYCLE_STOP_WRITE_AFTER_SECONDS) {
        log.debug(
          "prProducerPOSTer for %s: %s seconds passed: stop producer",
          name,
          secondsSinceCycleStart.toFixed(2)
        );
        return;
      }
    }

    if (CFG.stream_write_n_fragments == fragmentsPushed) {
      log.debug(
        "prProducerPOSTer for %s: %s fragments created and pushed: stop producer",
        name,
        fragmentsPushed
      );
      return;
    }

    await _produceAndPOSTpushrequest(streams, semaphore);
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
  pr: LogStreamFragmentPushRequest | TimeseriesFragmentPushMessage,
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
    } catch (e) {
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
  pr: LogStreamFragmentPushRequest | TimeseriesFragmentPushMessage
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
    if (frgmnt instanceof TimeseriesFragment) {
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
    } catch (e) {
      if (e instanceof got.RequestError) {
        // Note(JP): this code block is meant to handle only transient errors
        // (TCP conn errors/ timeout errors). I do hope that `e instanceof
        // got.RequestError` is not too specific, we will see.

        // Reflect this transient error in Prom counter. We could add a stream
        // name label here so that this error is associated with a specific
        // dummystream.
        pm.counter_get_non_http_errors.inc();

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
    pm.counter_get_responses.inc({ statuscode: response.statusCode });

    if (response.statusCode === 200) {
      util.logHTTPResponseLight(response);
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
