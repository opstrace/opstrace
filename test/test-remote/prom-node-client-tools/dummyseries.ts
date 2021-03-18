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
import Long from "long";

import { logqlLabelString } from "../loki-node-client-tools";

import {
  log,
  logHTTPResponse,
  httpTimeoutSettings,
  mtime,
  mtimeDiffSeconds
} from "../testutils";

import * as mathjs from "mathjs";

import {
  TimeseriesSample,
  TimeseriesFragment,
  LabelSet,
  FragmentStats,
  formatFloatForComp
} from "./index";

export interface DummyTimeseriesOpts {
  metricName: string;
  starttime: ZonedDateTime;
  uniqueName: string;
  labelset: LabelSet | undefined;
  timediffMilliSeconds: number;
  n_samples_per_series_fragment: number;
}

interface FetchAndValidateOpts {
  querierBaseUrl: string;
  chunkSize?: number;
  inspectEveryNthEntry?: number | undefined;
  customQueryFunc?: any;
  additionalHeaders?: Record<string, string>;
}

export class DummyTimeseries {
  private millisSinceEpochOfLastGeneratedSample: Long;
  private nFragmentsConsumed: number;
  private opts: any;
  private labels: LabelSet;
  private timediffMilliseconds: Long;
  private fragmentWidthSecondsForQuery: BigInt;

  uniqueName: string;
  metricName: string;
  starttime: ZonedDateTime;
  n_samples_per_series_fragment: number;
  nFragmentsSuccessfullySentSinceLastValidate: number;
  nSamplesValidatedSoFar: bigint;
  lastFragmentConsumed: TimeseriesFragment | undefined;
  postedFragmentsSinceLastValidate: Array<TimeseriesFragment>;

  constructor(opts: DummyTimeseriesOpts) {
    // For toString().
    this.opts = opts;

    this.postedFragmentsSinceLastValidate = [];

    this.uniqueName = opts.uniqueName;
    this.metricName = opts.metricName;

    // Merge the metric name into it using the well-known special prom label
    // __name__. If labelset is provided then use that. If labelset is not
    // provided then set a single label using uniquename.
    if (opts.labelset !== undefined) {
      this.labels = opts.labelset;
      this.labels.__name__ = this.metricName;
    } else {
      this.labels = { dummyseries: this.uniqueName, __name__: this.metricName };
    }

    if (opts.starttime.nano() != 0) {
      throw new Error("start time must not have fraction of seconds");
    }

    this.starttime = opts.starttime;

    if (!Number.isInteger(opts.timediffMilliSeconds)) {
      throw new Error("timediffMilliSeconds must be an integer value");
    }

    // The instant-query-range-vector-selector-validation-method has
    // interesting boundary conditions. To not make things too complicated
    // require integer multiples of 1000 for timediffMilliSeconds when this is
    // larger than 1000.
    if (opts.timediffMilliSeconds > 1000) {
      if (opts.timediffMilliSeconds % 1000 !== 0) {
        throw new Error(
          "timediffMilliSeconds must be integer multiple of 1000 if larger than 1000"
        );
      }
    }

    // The actual time width of a fragment in seconds, may be a float.
    // say, there are 1000 samples per fragment and timediffMilliSeconds is 1.
    // Then the actual fragment time width is 0.999 seconds.
    const fragmentWidthSeconds =
      ((opts.n_samples_per_series_fragment - 1) * opts.timediffMilliSeconds) /
      1000.0;

    // For timediffMilliSeconds being integer multiple of 1000 this is the
    // actual time width of a fragment (the time between the first and the last
    // sample). For smaller values of timediffMilliSeconds this is not the
    // actual time width of a fragment, but precisely one delta_t between two
    // samples more than that.. That's by design: this number must be an
    // integer, and is used for query construction.
    this.fragmentWidthSecondsForQuery = BigInt(Math.ceil(fragmentWidthSeconds));

    // Distinguish two special cases, also see ch1767;
    if (opts.timediffMilliSeconds < 1000) {
      log.debug("timediffMilliSeconds  < 1000, special validation");
      // Does adding one delta_t result in a fragment time width of n * 1 s?
      if (
        (opts.n_samples_per_series_fragment * opts.timediffMilliSeconds) %
          1000 ===
        0
      ) {
        // this means that precisely one sample is missing in a fragment for
        // it to comprise fragmentWidthSecondsForQuery.
        log.debug("sample count looks good");
      } else {
        throw new Error(
          "with timediffMilliSeconds < 1000 choose sample count S so that (S + 1) * timediffMilliSeconds = N 1 s"
        );
      }
    }

    // For non-1000 ms step fragments  (e.g. 1 ms between adjacent samples)
    // it's more important to have a 'round' number of samples than an integer
    // multiple of 1 s as fragment time width: with e.g. 10000 samples per
    // fragment the first sample can always have the '.000' fractional part,
    // and the last sample can always have the '.999' fractional part -- with
    // 100001 samples, these fractional parts change from fragment to fragment.

    // Translate (integer number, public) timediffMilliSeconds into (actual
    // integer, private) timediffMilliseconds.
    this.timediffMilliseconds = Long.fromInt(opts.timediffMilliSeconds);

    // Initialize this.millisSinceEpochOfLastGeneratedSample with starttime -
    // timediffMilliseconds
    const starttime_fractional_part_as_ms = Long.fromInt(
      Math.floor(opts.starttime.nano() / 10 ** 6)
    );
    const starttime_seconds_part_as_ms = Long.fromInt(
      opts.starttime.toEpochSecond()
    ).multiply(Long.fromInt(1000));

    this.millisSinceEpochOfLastGeneratedSample = starttime_seconds_part_as_ms
      .add(starttime_fractional_part_as_ms)
      .subtract(this.timediffMilliseconds);

    this.n_samples_per_series_fragment = opts.n_samples_per_series_fragment;

    this.nFragmentsConsumed = 0;

    // when using the dummystream to generate data and actually POST it
    // to an API use this counter to keep track of the number of fragments
    // successfully sent.
    this.nFragmentsSuccessfullySentSinceLastValidate = 0;

    // Keep track of how many entries were validated (from the start of the
    // stream). Used by fetchAndValidate().
    this.nSamplesValidatedSoFar = BigInt(0);
  }

  public toString = (): string => {
    return `DummyTimeseries(opts=${JSON.stringify(this.opts)})`;
  };

  private nextValue() {
    // Note: this ignores the compressability concept so far.
    return Math.random();
  }

  private nextSample() {
    this.millisSinceEpochOfLastGeneratedSample = this.millisSinceEpochOfLastGeneratedSample.add(
      this.timediffMilliseconds
    );

    return new TimeseriesSample(
      this.nextValue(),
      this.millisSinceEpochOfLastGeneratedSample
    );
  }

  public currentTimeRFC3339Nano(): string {
    return this.millisSinceEpochOfLastGeneratedSample.toString(); // todo: ..
  }

  // no stop criterion: dummyseries is an infinite concept (definite start, it
  // indefinite end) -- the caller decides how many fragments to generate.
  private generateNextFragment() {
    const t0 = mtime();
    const fragment = new TimeseriesFragment(
      this.labels,
      this.nFragmentsConsumed + 1,
      this
    );

    for (let i = 0; i < this.n_samples_per_series_fragment; i++) {
      fragment.addSample(this.nextSample());
    }

    const genduration = mtimeDiffSeconds(t0);
    log.debug(
      "TimeseriesFragment addSample loop took: %s s",
      genduration.toFixed(3)
    );
    return fragment;
  }

  public generateAndGetNextFragment(): TimeseriesFragment {
    const seriesFragment = this.generateNextFragment();
    this.nFragmentsConsumed += 1;
    return seriesFragment;
  }

  /**
   * Unbuffered POST to Cortex/Prometheus remote_write API:
   * generate/post/generate/post sequentially,  in that order ("buffered" would
   * be to pre-generate fragment and put them into a buffer so that when one
   * POST is done the next could start _immediately_)
   */
  public async postFragmentsToCortex(
    nFragments: number,
    cortexBaseUrl: string,
    additionalHeaders?: Record<string, string>
  ): Promise<void> {
    for (let i = 1; i <= nFragments; i++) {
      const fragment = this.generateAndGetNextFragment();
      const t0 = mtime();
      const pm = fragment.serialize();
      const genduration = mtimeDiffSeconds(t0);

      // Control log verbosity
      if (fragment.index < 5 || fragment.index % 10 === 0) {
        log.info(
          "Generated push message for series %s in %s s, push %s MiB (%s entries)",
          this.uniqueName,
          genduration.toFixed(2),
          pm.dataLengthMiB.toFixed(4),
          pm.fragment.sampleCount()
        );
      }
      await pm.postWithRetryOrError(cortexBaseUrl, 3, additionalHeaders);

      // drop actual samples (otherwise mem usage would grow quite fast).
      fragment.buildStatisticsAndDropData();
      this.postedFragmentsSinceLastValidate.push(fragment);
    }
  }

  // Most of FetchAndValidateOpts is ignored, just here to make this func
  // signature match DummyStream.fetchAndValidate
  public async fetchAndValidate(opts: FetchAndValidateOpts): Promise<number> {
    log.info("%s fetchAndValidate()", this);

    const baseUrl = opts.querierBaseUrl;
    const additionalHeaders = opts.additionalHeaders;

    let samplesValidated = 0;
    let fragmentsValidated = 0;
    for (const fragment of this.postedFragmentsSinceLastValidate) {
      const validated = await this.fetchAndValidateFragment(
        fragment,
        baseUrl,
        additionalHeaders
      );
      samplesValidated += validated;
      fragmentsValidated += 1;

      // Control log verbosity
      if (fragmentsValidated % 20 === 0) {
        log.info(
          "%s fetchAndValidate(): %s fragments validated (%s samples)",
          this.uniqueName,
          fragmentsValidated,
          samplesValidated
        );
      }
    }

    this.postedFragmentsSinceLastValidate = [];
    return samplesValidated;
  }

  private queryParamsForFragment(fragment: TimeseriesFragment) {
    // these query parameters implement the
    // instant-query-range-vector-selector-validation-method. also see ch1767
    // `timeMillisSinceEpochLast` is time timestamp (in ms since epoch) of the
    // last (rightmost) sample in the fragment.

    // the following validation is probably not necessary, but don't have the
    // brain power to be 100 % sure right now.
    if (!Number.isInteger(fragment.stats!.timeMillisSinceEpochLast)) {
      log.error("not integer: %s", fragment.stats!.timeMillisSinceEpochLast);
      throw new Error(
        "fragment.stats.timeMillisSinceEpochLast must be an integer value"
      );
    }

    // the `time` query parameter is a timestamp with 1s resolution (it is not
    // possible to define the right boundary with sub-second resolution). round
    // UP to the next full second. This is a noop when
    // `this.timediffMilliseconds` is n * 1000.

    const timeRightBoundarySeconds = Math.ceil(
      fragment.stats!.timeMillisSinceEpochLast / 1000.0
    );

    log.debug("timeRightBoundarySeconds: %s", timeRightBoundarySeconds);

    const params = {
      query: `${logqlLabelString(this.labels)}[${
        this.fragmentWidthSecondsForQuery
      }s]`,
      time: timeRightBoundarySeconds
    };
    log.debug("query params: %s", params);
    return params;
  }

  private async fetchAndValidateFragment(
    fragment: TimeseriesFragment,
    baseUrl: string,
    additionalHeaders?: Record<string, string>
  ): Promise<number> {
    // instant-query-range-vector-selector-validation-method
    const url = `${baseUrl}/api/v1/query`;

    const qparams = this.queryParamsForFragment(fragment);
    let headers: Record<string, string> = {};
    if (additionalHeaders !== undefined) {
      headers = {
        ...headers,
        ...additionalHeaders
      };
    }

    const options = {
      throwHttpErrors: false,
      searchParams: qparams,
      headers: headers,
      timeout: httpTimeoutSettings,
      https: { rejectUnauthorized: false } // disable TLS verification for now
    };

    const response = await got(url, options);
    if (response.statusCode != 200) logHTTPResponse(response);

    const data = JSON.parse(response.body);
    const resultArray = data["data"]["result"];

    //log.info("response data: %s", JSON.stringify(data, null, 2));

    log.debug("number of series in query result: %s", resultArray.length);
    if (resultArray.length != 1) {
      log.error("unexpected response data: %s", JSON.stringify(data, null, 2));
      throw Error("not precisely one series in result");
    }

    // "unzip" array of 2-tuples:
    //
    // "values": [
    //   [
    //     1591805210.117,
    //     "0.7295753251993067"
    //   ],
    //   [
    //     1591805211.117,
    //     "0.002709570885711221"
    //   ],
    //   [
    // ...
    const values = [];
    const timestamps = [];
    for (const sample of resultArray[0].values) {
      timestamps.push(sample[0]);
      values.push(Number(sample[1]));
    }

    // The following logic is simple, but difficult to follow by just reading
    // code. If `timediffMilliseconds < 1000 then `timeRightBoundarySeconds`
    // (the rightmost query boundary which acts _inclusively_) yields a sample
    // that belongs to the _next_ fragment, and not to the current one.
    // correct for that (log output below shows this well: shows mismatch
    // without this corrective step) -- this generation and validation logic
    // requires a bit of a write-up to be better understandable.
    //
    // 2020-06-16T13:41:16.010Z info: fragmentStats reference: {
    //   min: '0.00012731978478',
    //   max: '0.99991465559724',
    //   var: '0.08256607657868',
    //   timeMillisSinceEpochFirst: 1592312170000,
    //   timeMillisSinceEpochLast: 1592312179999,
    //   sampleCount: 10000n
    // }
    // 2020-06-16T13:41:16.010Z info: for comparison: {
    //   min: '0.00012731978478',
    //   max: '0.99991465559724',
    //   var: '0.08256372903300',
    //   timeMillisSinceEpochFirst: 1592312170000,
    //   timeMillisSinceEpochLast: 1592312180000,
    //   sampleCount: 10001n
    // }

    if (this.timediffMilliseconds.toNumber() < 1000) {
      // that is, fragment.stats!.timeMillisSinceEpochLast / 1000.0 yields
      // a non-integer value, and (if this is not the last fragment pushed
      // from a dummy series) the query is expected to return the first sample
      // of the subsequent fragment.
      if (values.length === this.n_samples_per_series_fragment + 1) {
        log.debug(
          "last sample in query result belongs to next fragment, ignore"
        );
        timestamps.pop();
        values.pop();
      }
    }

    const stats: FragmentStats = {
      min: formatFloatForComp(mathjs.min(values)),
      max: formatFloatForComp(mathjs.max(values)),
      var: formatFloatForComp(mathjs.variance(values)),
      timeMillisSinceEpochFirst: Math.trunc(timestamps[0] * 1000),
      timeMillisSinceEpochLast: Math.trunc(timestamps.slice(-1)[0] * 1000),
      sampleCount: BigInt(values.length)
    };

    log.debug("fragmentStats reference: %s", fragment.stats);
    log.debug("for comparison: %s", stats);

    assert.deepEqual(fragment.stats, stats);
    this.nSamplesValidatedSoFar += BigInt(values.length);

    // return the number of validated samples to the caller of this method, too
    return values.length;
  }
}
