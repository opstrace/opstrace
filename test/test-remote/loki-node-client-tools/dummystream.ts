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

import { ZonedDateTime, LocalDateTime, ZoneOffset } from "@js-joda/core";

import {
  log,
  rndstringFast,
  rndstringFastBoringFill,
  timestampToRFC3339Nano,
  mtime,
  mtimeDiffSeconds
} from "../testutils";

import { waitForLokiQueryResult, LokiQueryResult } from "../testutils/logs";

import {
  LogStreamEntry,
  LogStreamLabelset,
  LogStreamEntryTimestamp,
  LogStreamFragment,
  logqlLabelString
} from "./index";

// Note: maybe expose raw labels later on again.
export interface DummyStreamOpts {
  n_entries_per_stream_fragment: number;
  n_chars_per_message: number;
  starttime: ZonedDateTime;
  timediffNanoseconds: number;
  includeTimeInMsg: boolean;
  uniqueName: string;
  labelset: LogStreamLabelset | undefined;
  compressability: string;
}

type CustomQueryFuncSigType = (
  arg0: string,
  arg1: Record<string, string>,
  arg2: number,
  arg3: number,
  arg4: DummyStream
) => Promise<LokiQueryResult>;

export interface DummyStreamFetchAndValidateOpts {
  querierBaseUrl: string;
  chunkSize?: number;
  inspectEveryNthEntry?: number | undefined;
  customLokiQueryFunc?: CustomQueryFuncSigType;
  additionalHeaders?: Record<string, string>;
}

export class DummyStream {
  private currentSeconds: number;
  private currentNanos: number;
  private nFragmentsConsumed: number;
  private includeTimeInMsg: boolean;
  private firstEntryGenerated: boolean;
  private opts: unknown;
  private labels: LogStreamLabelset;
  private nEntriesValidatedSoFar: bigint;
  private genChars: (n: number) => string;

  uniqueName: string;
  starttime: ZonedDateTime;
  n_entries_per_stream_fragment: number;
  n_chars_per_message: number;
  timediffNanoseconds: number;
  nFragmentsSuccessfullySentSinceLastValidate: number;

  //  It's a little unclear how the generator generateFragments runs code
  //  potentially eagerly or lazily (it seems like it pre-generates the next
  //  fragment, i.e. runs up to 'yield'). To make it absolutely unambiguous
  //  allow for the consumer to set the last fragment consumed via this
  //  method.
  lastFragmentConsumed: LogStreamFragment | undefined;

  constructor(opts: DummyStreamOpts) {
    // For toString.
    this.opts = opts;

    this.uniqueName = opts.uniqueName;

    if (opts.labelset !== undefined) {
      this.labels = opts.labelset;
    } else {
      this.labels = { dummystream: this.uniqueName };
    }

    this.starttime = opts.starttime;
    this.currentSeconds = opts.starttime.toEpochSecond();
    this.currentNanos = opts.starttime.nano();
    this.firstEntryGenerated = false;

    this.n_entries_per_stream_fragment = opts.n_entries_per_stream_fragment;
    this.n_chars_per_message = opts.n_chars_per_message;
    this.timediffNanoseconds = opts.timediffNanoseconds;
    this.nFragmentsConsumed = 0;
    this.includeTimeInMsg = opts.includeTimeInMsg;

    // when using the dummystream to generate data and actually POST it
    // to an API use this counter to keep track of the number of fragments
    // successfully sent. This is public because of external push func.
    this.nFragmentsSuccessfullySentSinceLastValidate = 0;

    // Keep track of how many entries were validated (from the start of the
    // stream). Used by fetchAndValidate().
    this.nEntriesValidatedSoFar = BigInt(0);

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

  public toString = (): string => {
    return `DummyStream(opts=${JSON.stringify(this.opts)})`;
  };

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

  private nextEntry() {
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

  // public *generateFragments() {
  //   // `this.nFragmentsConsumed` starts at 0. During stream generation,
  //   // depending on exactly when one is looking, from the outside point of view
  //   // it might be off by 1 compared to the _actual_ number of fragments
  //   // returned by the generator so far. That's ok.
  //   log.info(
  //     "%s: entering generateFragments with nFragmentsConsumed, n_fragments_total: %s, %s",
  //     this,
  //     this.nFragmentsConsumed,
  //     this.n_fragments_total
  //   );
  //   for (
  //     this.nFragmentsConsumed;
  //     this.nFragmentsConsumed < this.n_fragments_total;
  //     this.nFragmentsConsumed++
  //   ) {
  //     const logStreamFragment = this.generateNextFragment();
  //     yield logStreamFragment;
  //   }
  // }

  // no stop criterion
  private generateNextFragment() {
    const logStreamFragment = new LogStreamFragment(
      this.labels,
      this.nFragmentsConsumed + 1,
      this
    );
    for (let i = 0; i < this.n_entries_per_stream_fragment; i++) {
      logStreamFragment.addEntry(this.nextEntry());
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
          pushrequest.fragment.entryCount()
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
    // not yet built in
    // const additionalHeaders = opts.additionalHeaders;

    // chunkSize: think of it as "fetch at most those many entries per query"
    const expectedEntryCount =
      this.nFragmentsSuccessfullySentSinceLastValidate *
      this.n_entries_per_stream_fragment;

    const vt0 = mtime();
    log.debug(
      "%s: validate. Sent %s fragments since last validation. Expect %s entries. Previously validated: %s entries",
      this,
      this.nFragmentsSuccessfullySentSinceLastValidate,
      expectedEntryCount,
      this.nEntriesValidatedSoFar
    );

    let entriesRemainingToBeChecked = expectedEntryCount;
    let chunkIndex = 1;

    // cheap way out: do not check the last chunk in this loop.
    while (entriesRemainingToBeChecked > 0) {
      const queryParams = this.queryParamsForVerify(
        BigInt(chunkSize),
        BigInt(chunkIndex),
        this.nEntriesValidatedSoFar
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
          queryParams,
          expectedCount,
          chunkIndex,
          this // pass dummystream object to func for better error reporting
        );
      } else {
        // used by e.g. test-remote project (can change)
        result = await waitForLokiQueryResult(
          lokiQuerierBaseURL,
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
    this.nEntriesValidatedSoFar += BigInt(expectedEntryCount);

    // return the number of entries read (and validated)
    return expectedEntryCount;
  }
}
