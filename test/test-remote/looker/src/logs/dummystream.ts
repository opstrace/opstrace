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
import crypto from "crypto";

import got from "got";
import { ZonedDateTime, LocalDateTime, ZoneOffset } from "@js-joda/core";

import { log } from "../log";
import {
  mtimeDiffSeconds,
  mtimeDeadlineInSeconds,
  mtime,
  sleep
} from "../mtime";

import {
  timestampToRFC3339Nano,
  rndstringFast,
  rndstringFastBoringFill,
  httpTimeoutSettings,
  logHTTPResponse
} from "../util";

import {
  LogStreamEntry,
  LogStreamEntryTimestamp,
  LogStreamFragment,
  logqlLabelString
} from "./index";

import { LabelSet } from "../metrics";

import { DummyTimeseriesBase } from "../metrics";

// Note: maybe expose raw labels later on again.
export interface DummyStreamOpts {
  // think: n log entries per stream/series fragment
  n_samples_per_series_fragment: number;
  n_chars_per_message: number;
  starttime: ZonedDateTime;
  timediffNanoseconds: number;
  includeTimeInMsg: boolean;
  uniqueName: string;
  labelset: LabelSet | undefined;
  compressability: string;
}

type TypeHttpHeaderDict = Record<string, string>;
type TypeQueryParamDict = Record<string, string>;

type CustomQueryFuncSigType = (
  arg0: string,
  arg1: TypeHttpHeaderDict,
  arg2: TypeQueryParamDict,
  arg3: number,
  arg4: number,
  arg5: DummyStream
) => Promise<LokiQueryResult>;

export interface DummyStreamFetchAndValidateOpts {
  querierBaseUrl: string;
  chunkSize?: number;
  inspectEveryNthEntry?: number | undefined;
  customLokiQueryFunc?: CustomQueryFuncSigType;
  additionalHeaders?: Record<string, string>;
}

export class DummyStream extends DummyTimeseriesBase {
  private currentSeconds: number;
  private currentNanos: number;
  private includeTimeInMsg: boolean;
  private firstEntryGenerated: boolean;
  private genChars: (n: number) => string;
  private shouldBeValidatedflag: boolean;

  n_chars_per_message: number;
  timediffNanoseconds: number;
  nFragmentsSuccessfullySentSinceLastValidate: number;

  constructor(opts: DummyStreamOpts) {
    super(opts);

    this.shouldBeValidatedflag = true;

    this.currentSeconds = opts.starttime.toEpochSecond();
    this.currentNanos = opts.starttime.nano();
    this.firstEntryGenerated = false;

    this.n_chars_per_message = opts.n_chars_per_message;
    this.timediffNanoseconds = opts.timediffNanoseconds;
    this.nFragmentsConsumed = 0;
    this.includeTimeInMsg = opts.includeTimeInMsg;

    // when using the dummystream to generate data and actually POST it
    // to an API use this counter to keep track of the number of fragments
    // successfully sent. This is public because of external push func.
    this.nFragmentsSuccessfullySentSinceLastValidate = 0;

    if (this.timediffNanoseconds > 999999999)
      throw Error("timediffNanoseconds must be smaller than 1 s");

    if (this.includeTimeInMsg && this.n_chars_per_message < 19) {
      throw Error("timestamp consumes 18+1 characters");
    }

    switch (opts.compressability) {
      case "min":
        this.genChars = rndstringFast;
        break;
      case "max":
        this.genChars = (n: number) => {
          return "a".repeat(n);
        };
        break;
      case "medium":
        this.genChars = (n: number) => {
          // "half random", "half always-the-same"
          // fast floored integer division:
          // (11/2>>0) -> 5
          // remainder: 11 % 2 -> 1
          // example for n=10:
          //  rndstringFastBoringFill(5, 5)
          // example for n=11:
          //  rndstringFastBoringFill(5, 6)
          // Note(JP): this could be further optimized by making n not be
          // dynamic (because considering `includeTimeInMsg` and the rest of
          // the static dummystream config this is predictable, n does not need
          // to be dynamically evaluated upon _each_ function call here).
          return rndstringFastBoringFill(
            (n / 2) >> 0,
            ((n / 2) >> 0) + (n % 2)
          );
        };
        break;
      default:
        throw new Error(`bad compressability value: ${opts.compressability}`);
    }
  }

  // public addToNFragmentsTotal(n: number) {
  //   this.opts.n_fragments_total += n;
  //   this.n_fragments_total += n;
  // }

  protected buildLabelSetFromOpts(opts: DummyStreamOpts) {
    let ls: LabelSet;
    if (opts.labelset !== undefined) {
      ls = opts.labelset;
      ls.looker_uniquename = opts.uniqueName;
    } else {
      ls = { looker_uniquename: opts.uniqueName };
    }
    return ls;
  }

  public promQueryString(): string {
    return `{looker_uniquename="${this.uniqueName}"}`;
  }

  private buildMsgText(): string {
    let text: string;
    if (!this.includeTimeInMsg) text = this.genChars(this.n_chars_per_message);
    else {
      // build integer string, indicating the number of nanoseconds passed
      // since epoch, as is common in the Loki ecosystem.
      const timestring = `${
        this.currentSeconds
      }${this.currentNanos.toString().padStart(9, "0")}`;
      // Note(JP): timestring is known to be 19 chars long. Also note that in
      // this case the "compressability" aspect changes, depending on the ratio
      // between the desired message length and the length of this timestring.
      // From a message length of 100 onwards I believer it is fair to say
      // that "max" compressability is still a very high compressability even
      // when the message is prefixed with this timestring.
      text = `${timestring}:${this.genChars(this.n_chars_per_message - 19)}`;
    }
    return text;
  }

  protected nextSample(): LogStreamEntry {
    // don't bump time before first entry was generated.
    if (this.firstEntryGenerated) {
      this.currentNanos += this.timediffNanoseconds;
      if (this.currentNanos > 999999999) {
        this.currentNanos = this.currentNanos - 10 ** 9;
        this.currentSeconds += 1;
      }
    }

    const ts: LogStreamEntryTimestamp = {
      seconds: this.currentSeconds,
      nanos: this.currentNanos
    };

    // of course this only needs to be run once, and I hope that the compiler
    // optimizes this away.
    this.firstEntryGenerated = true;
    return new LogStreamEntry(this.buildMsgText(), ts);
  }

  // no stop criterion
  protected generateNextFragment(): LogStreamFragment {
    const logStreamFragment = new LogStreamFragment(
      this.labels,
      this.nFragmentsConsumed + 1,
      this
    );
    for (let i = 0; i < this.n_samples_per_series_fragment; i++) {
      logStreamFragment.addEntry(this.nextSample());
    }
    return logStreamFragment;
  }

  /**
   * Explicitly generate next fragment and return. This is for an external
   * entity to control when exactly a fragment is generated and when not,
   * as the generator above executes eagerly.
   * quick note: keep using generator for test-remote for now, but in looker
   * use this explicit method.
   * no stop criterion
   */
  public generateAndGetNextFragment(): LogStreamFragment {
    const logStreamFragment = this.generateNextFragment();
    this.nFragmentsConsumed += 1;
    return logStreamFragment;
  }

  /**
   * Unbuffered POST to Loki (generate/post/generate/post sequentially in that
   * order, and do not retry upon POST errors, except for 429 responses.
   *
   * @param lokiBaseUrl
   */
  public async postFragmentsToLoki(
    nFragments: number,
    lokiBaseUrl: string,
    additionalHeaders?: Record<string, string>
  ) {
    // For now: one HTTP request per fragment
    for (let i = 1; i <= nFragments; i++) {
      const fragment = this.generateAndGetNextFragment();
      const t0 = mtime();
      const pushrequest = fragment.serialize();
      const genduration = mtimeDiffSeconds(t0);
      // Control log verbosity
      if (fragment.index < 5 || fragment.index % 10 === 0) {
        log.info(
          "Generated PR for stream %s in %s s, push %s MiB (%s entries)",
          this.uniqueName,
          genduration.toFixed(2),
          pushrequest.dataLengthMiB.toFixed(4),
          // for now: assume that there is _one_ fragment here
          pushrequest.fragments[0].entryCount()
        );
      }
      await pushrequest.postWithRetryOrError(lokiBaseUrl, 3, additionalHeaders);
    }
  }

  public currentTime(): ZonedDateTime {
    // Return the time corresponding to the last generated entry.

    // First, construct datetime object with 1 s resoltution.
    const tsSecondResolution = LocalDateTime.ofEpochSecond(
      this.currentSeconds,
      ZoneOffset.UTC
    );

    // Now construct datetime object with ns resolution using the previous
    // object.
    const tsNanoSecondResolution = LocalDateTime.of(
      tsSecondResolution.year(),
      tsSecondResolution.month(),
      tsSecondResolution.dayOfMonth(),
      tsSecondResolution.hour(),
      tsSecondResolution.minute(),
      tsSecondResolution.second(),
      this.currentNanos
    );

    return tsNanoSecondResolution.atZone(ZoneOffset.UTC);
  }

  public currentTimeRFC3339Nano(): string {
    return timestampToRFC3339Nano(this.currentTime());
  }

  public disableValidation(): void {
    this.shouldBeValidatedflag = false;
  }

  public enableValidation(): void {
    this.shouldBeValidatedflag = true;
  }

  public shouldBeValidated(): boolean {
    return this.shouldBeValidatedflag;
  }

  public dropValidationInfo(): void {
    // a noop so far, see DummyTimeseries for what this is about
  }

  private timeofEntryN(N: bigint): bigint {
    // Get the time of the first entry (1) in the stream as an integer number
    // representing the number of nanoseconds passed since epoch.
    const start =
      BigInt(this.starttime.toEpochSecond()) * BigInt(10 ** 9) +
      BigInt(this.starttime.nano());

    // Entry 1: return start time.
    const timeOfEntry =
      start + (N - BigInt(1)) * BigInt(this.timediffNanoseconds);

    // Return string indicating nanoseconds since epoch.
    return timeOfEntry;
  }

  private queryParamsForVerify(
    chunksize: bigint,
    chunkindex: bigint,
    offset: bigint
  ) {
    // Fetch entries in "chunks". The first chunk has index 1.
    // The first entry has index 1. The chunk size is the number of entries.
    // Example: chunk size 100
    //    chunk index 1:
    //        yield entries 1-100 (including 100)
    //    chunk index 2:
    //        yield entries 101-200 (including 200)
    // Offset: the first entry in the first chunk is not entry 1 in the stream
    // but instead it is entry O+1.
    // offset can be large so do all of this in bigint.

    let startEntryIdx: bigint;
    let endEntryIdx: bigint;
    startEntryIdx = (chunkindex - BigInt(1)) * chunksize + BigInt(1);
    endEntryIdx = chunkindex * chunksize;

    // Apply offset separately to make things appear not more complicated
    // than they are.
    startEntryIdx += offset;
    endEntryIdx += offset;

    log.info(
      "query startEntryIdx, endEntryIdx: %s, %s",
      startEntryIdx,
      endEntryIdx
    );

    const queryParams = {
      query: logqlLabelString(this.labels),
      direction: "FORWARD",
      limit: chunksize.toString(),
      start: this.timeofEntryN(startEntryIdx).toString(),
      // end is not inclusive, i.e. if we set `end` to e.g. 1582211051130000099
      // then the last entry returned would be from 1582211051130000098 even if
      // there is one at 1582211051130000099. So, bump this by one nanosecond
      // to get N entries returned in the happy case.
      end: this.timeofEntryN(endEntryIdx + BigInt(1)).toString()
    };
    return queryParams;
  }

  public async fetchAndValidate(
    opts: DummyStreamFetchAndValidateOpts
  ): Promise<number> {
    const lokiQuerierBaseURL = opts.querierBaseUrl;
    const chunkSize = opts.chunkSize || 20000;
    const inspectEveryNthEntry = opts.inspectEveryNthEntry || 0;
    const customLokiQueryFunc = opts.customLokiQueryFunc;

    const additionalHeaders = opts.additionalHeaders || {};

    // chunkSize: think of it as "fetch at most those many entries per query"
    const expectedEntryCount =
      this.nFragmentsSuccessfullySentSinceLastValidate *
      this.n_samples_per_series_fragment;

    const vt0 = mtime();
    log.debug(
      "%s: validate. Sent %s fragments since last validation. Expect %s entries. Previously validated: %s entries",
      this,
      this.nFragmentsSuccessfullySentSinceLastValidate,
      expectedEntryCount,
      this.nSamplesValidatedSoFar
    );

    let entriesRemainingToBeChecked = expectedEntryCount;
    let chunkIndex = 1;

    // cheap way out: do not check the last chunk in this loop.
    while (entriesRemainingToBeChecked > 0) {
      const queryParams = this.queryParamsForVerify(
        BigInt(chunkSize),
        BigInt(chunkIndex),
        this.nSamplesValidatedSoFar
      );
      // the last chunk might be expected to be smaller than the regular
      // chunk size.
      log.info("remaining entries: %s", entriesRemainingToBeChecked);
      let expectedCount = chunkSize;
      if (entriesRemainingToBeChecked < chunkSize)
        expectedCount = entriesRemainingToBeChecked;

      log.info(
        "waitForLokiQueryResult() for chunk %s. expectedCount: %s. ",
        chunkIndex,
        expectedCount
      );

      let result: LokiQueryResult;
      if (customLokiQueryFunc !== undefined) {
        // why would the compiler not know that in here customQueryFunc is indeed
        // _not_ undefined?
        //@ts-ignore: see comment above
        result = await customLokiQueryFunc(
          lokiQuerierBaseURL,
          additionalHeaders,
          queryParams,
          expectedCount,
          chunkIndex,
          this // pass dummystream object to func for better error reporting
        );
      } else {
        // used by e.g. test-remote project (can change)
        result = await waitForLokiQueryResult(
          lokiQuerierBaseURL,
          additionalHeaders,
          queryParams,
          expectedCount,
          false,
          1,
          false // disable building hash over payload
        );
      }

      log.info("got result with hash '%s'", result.textmd5);

      //   {
      //     "ts": "2020-02-20T15:23:38.483000026Z",
      //     "line": "1582212218483000026:5_iz3O9NTnGE97l <snip>"
      //   },

      // validate payload
      for (const entry of result.entries) {
        entriesRemainingToBeChecked -= 1;

        if (
          inspectEveryNthEntry &&
          entriesRemainingToBeChecked % inspectEveryNthEntry
        ) {
          // this parsing is rather costly, only validate every Nth sample.
          continue;
        }
        const tstring = entry[0];
        if (!entry[1].startsWith(tstring)) {
          log.error("invalid entry: %s", entry);
          throw Error("boo!");
        }
      }
      log.info(
        "validated %s entries (inspected every Nth entry: %s (0: all))",
        result.entries.length,
        inspectEveryNthEntry
      );
      //entriesRemainingToBeChecked -= expectedCount;
      chunkIndex += 1;
    }
    log.info(
      "stream %s: validation took %s s overall",
      this.uniqueName,
      mtimeDiffSeconds(vt0).toFixed(1)
    );

    this.nFragmentsSuccessfullySentSinceLastValidate = 0;
    this.nSamplesValidatedSoFar += BigInt(expectedEntryCount);

    // return the number of entries read (and validated)
    return expectedEntryCount;
  }
}

export interface LokiQueryResult {
  entries: Array<[string, string]>;
  labels: LabelSet;
  textmd5: string;
}

/**
 * Expected to throw got.RequestError, handle in caller if desired.
 */
async function queryLoki(
  baseUrl: string,
  queryParams: URLSearchParams,
  additionalHeaders: TypeHttpHeaderDict
) {
  /* Notes, in no particular order:

  - Note that Loki seems to set `'Content-Type': 'text/plain; charset=utf-8'`
    even when it sends a JSON document in the response body. Submit a bug
    report, and at some point test that this is not the case anymore here.
  */
  const url = `${baseUrl}/loki/api/v1/query_range`;

  const options = {
    throwHttpErrors: false,
    searchParams: queryParams,
    timeout: httpTimeoutSettings,
    headers: additionalHeaders,
    https: { rejectUnauthorized: false } // insecure TLS for now
  };

  // Note: this may throw got.RequestError for request timeout errors.
  const response = await got(url, options);
  if (response.statusCode !== 200) logHTTPResponse(response);
  return JSON.parse(response.body);
}

async function waitForLokiQueryResult(
  lokiQuerierBaseUrl: string,
  additionalHeaders: TypeHttpHeaderDict,
  queryParams: TypeQueryParamDict,
  expectedEntryCount: number | undefined,
  logDetails = true,
  expectedStreamCount = 1,
  buildhash = true,
  maxWaitSeconds = 30
): Promise<LokiQueryResult> {
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

    let result: any;
    try {
      result = await queryLoki(lokiQuerierBaseUrl, qparms, additionalHeaders);
    } catch (e) {
      // handle any error that happened during http request processing
      if (e instanceof got.RequestError) {
        log.info(
          `waitForLokiQueryResult() loop: http request failed: ${e.message} -- ignore, proceed with next iteration`
        );
        continue;
      } else {
        // Throw any other error, mainly programming error.
        throw e;
      }
    }

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
      const labels: LabelSet = streams[0].stream; //logqlKvPairTextToObj(data["streams"][0]["labels"]);
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
