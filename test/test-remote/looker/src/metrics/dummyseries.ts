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
import got, { Response as GotResponse } from "got";
import Long from "long";

import { logqlLabelString } from "../logs";

import { mtimeDiffSeconds, mtime, sleep } from "../mtime";
import { log } from "../log";
import { logHTTPResponse, httpTimeoutSettings } from "../util";

import * as mathjs from "mathjs";

import { TimeseriesBase, LabelSet, WalltimeCouplingOptions } from "../series";

import {
  MetricSample,
  MetricSeriesFragment,
  MetricSeriesFragmentStats,
  formatFloatForComp
} from "./index";

export interface MetricSeriesOpts {
  metricName: string;
  starttime: ZonedDateTime;
  uniqueName: string;
  labelset: LabelSet | undefined;
  // The time difference between adjacent metric samples in a series fragment,
  // in milliseconds. Expected to be an integer. Defined via the substraction
  // of timestamps: T_(i+1) - T_i  or via addition:
  // next_timestamp = previous_timestamp + increment
  sample_time_increment_ns: number;
  n_samples_per_series_fragment: number;
  wtopts?: WalltimeCouplingOptions;
  // Supposed to contain a prometheus counter object, providing an inc() method.
  counterForwardLeap?: any;
}

export interface MetricSeriesFetchAndValidateOpts {
  querierBaseUrl: string;
  additionalHeaders?: Record<string, string>;
  chunkSize?: number;
  inspectEveryNthEntry?: number | undefined;
  customHTTPGetFunc?: (
    url: string,
    gotRequestOptions: any
  ) => Promise<GotResponse<string>>;
}

export class MetricSeries extends TimeseriesBase<MetricSeriesFragment> {
  private millisSinceEpochOfLastGeneratedSample: Long;
  private metrics_time_increment_ms: Long;
  private fragmentWidthSecondsForQuery: BigInt;
  private lastValue: number;

  //private logLagBehindWalltimeEveryNseconds: private;

  metricName: string;
  nFragmentsSuccessfullySentSinceLastValidate: number;

  // `undefined` means: do not collect validation info; this is so
  // that we ideally save memory
  postedFragmentsSinceLastValidate: Array<MetricSeriesFragment> | undefined;

  constructor(opts: MetricSeriesOpts) {
    super(opts);

    if (this.walltimeCouplingOptions === undefined) {
      // This is not covered in the base class because not required for both,
      // LogSeries and MetricSeries.
      log.info(
        "MetricSeries requires walltimeCouplingOptions to be defined. " +
          "Fall back to using default parameters."
      );
      this.walltimeCouplingOptions = {
        maxLagSeconds: 30 * 60,
        minLagSeconds: 2 * 60
      };

      // Use validation logic in base class to confirm that these parameters
      // comply.
      this.validateWtOpts(this.walltimeCouplingOptions);
    }

    this.postedFragmentsSinceLastValidate = undefined;

    this.metricName = opts.metricName;

    if (opts.starttime.nano() != 0) {
      throw new Error("start time must not have fraction of seconds");
    }

    // Sample timestamps must not have fractions of milliseconds (that's a
    // choice of the prometheus ecosystem).
    if (opts.sample_time_increment_ns % 1000 !== 0) {
      throw new Error(
        "for metrics, sample_time_increment_ns must be integer multiple of 1000"
      );
    }

    // Translate nanoseconds to milliseconds for better readability of
    // subsequent code.
    const sampleTimeIncrementMs = opts.sample_time_increment_ns / 1000;

    // The instant-query-range-vector-selector-validation-method has
    // interesting boundary conditions. To not make things too complicated
    // require integer multiples of 1000 for sampleTimeIncrementMs when this is
    // larger than 1000. That is, if the user chooses that the spacing between
    // adjacent metric samples should be later than one second, require integer
    // multiples of one second -- disallow fractions of seconds.
    if (sampleTimeIncrementMs > 1000) {
      if (sampleTimeIncrementMs % 1000 !== 0) {
        throw new Error(
          "the time increment between metric samples must be an integer  " +
            "multiple of one second if it is larger than one second"
        );
      }
    }

    // The actual time width of a fragment in seconds, may be a float.
    // say, there are 1000 samples per fragment and metrics_time_increment_ms is 1.
    // Then the actual fragment time width is 0.999 seconds.
    const fragmentWidthSeconds =
      ((opts.n_samples_per_series_fragment - 1) * sampleTimeIncrementMs) /
      1000.0;

    // For metrics_time_increment_ms being integer multiple of 1000 this is the
    // actual time width of a fragment (the time between the first and the last
    // sample). For smaller values of metrics_time_increment_ms this is not the
    // actual time width of a fragment, but precisely one delta_t between two
    // samples more than that.. That's by design: this number must be an
    // integer, and is used for query construction.
    this.fragmentWidthSecondsForQuery = BigInt(Math.ceil(fragmentWidthSeconds));

    // Distinguish two special cases, also see ch1767;
    if (sampleTimeIncrementMs < 1000) {
      // Does adding one delta_t result in a fragment time width of n * 1 s?
      if (
        (opts.n_samples_per_series_fragment * sampleTimeIncrementMs) % 1000 !==
        0
      ) {
        throw new Error(
          "with metrics_time_increment_ms < 1000 choose " +
            "n_samples_per_series_fragment so that " +
            "n_samples_per_series_fragment * metrics_time_increment_ms = multiple of 1000"
        );
      }
    }

    // For non-1000 ms step fragments  (e.g. 1 ms between adjacent samples)
    // it's more important to have a 'round' number of samples than an integer
    // multiple of 1 s as fragment time width: with e.g. 10000 samples per
    // fragment the first sample can always have the '.000' fractional part,
    // and the last sample can always have the '.999' fractional part -- with
    // 100001 samples, these fractional parts change from fragment to fragment.

    // Translate (integer number, public) opts.metrics_time_increment_ms into (actual
    // integer, private) this.metrics_time_increment_ms.
    this.metrics_time_increment_ms = Long.fromInt(sampleTimeIncrementMs);

    // Initialize this.millisSinceEpochOfLastGeneratedSample with starttime -
    // metrics_time_increment_ms
    const starttime_fractional_part_as_ms = Long.fromInt(
      Math.floor(opts.starttime.nano() / 10 ** 6)
    );

    const starttime_seconds_part_as_ms = Long.fromInt(
      opts.starttime.toEpochSecond()
    ).multiply(Long.fromInt(1000));

    this.millisSinceEpochOfLastGeneratedSample = starttime_seconds_part_as_ms
      .add(starttime_fractional_part_as_ms)
      .subtract(this.metrics_time_increment_ms);

    // when using the dummystream to generate data and actually POST it
    // to an API use this counter to keep track of the number of fragments
    // successfully sent.
    this.nFragmentsSuccessfullySentSinceLastValidate = 0;

    // Keep track of how many entries were validated (from the start of the
    // stream). Used by fetchAndValidate().
    this.nSamplesValidatedSoFar = BigInt(0);

    // Initialize value for random walk, between -5 and 5, and cut to a certain
    // level of precision. TODO: make interval width a parameter (currently 10).
    // Example:
    // > Number(((Math.random() - 0.5) * 10.0).toFixed(1))
    //   3.2
    this.lastValue = Number(((Math.random() - 0.5) * 10.0).toFixed(1));
  }

  protected buildLabelSetFromOpts(opts: MetricSeriesOpts): LabelSet {
    // Merge the metric name into it using the well-known special prom label
    // __name__. Always set `uniquename` and `__name__`. If `opts.labelset` is
    // provided then treat this as _additional_ label set.
    let ls: LabelSet;
    if (opts.labelset !== undefined) {
      ls = opts.labelset;
      ls.uniquename = opts.uniqueName;
      ls.__name__ = opts.metricName;
    } else {
      ls = { uniquename: opts.uniqueName, __name__: opts.metricName };
    }
    return ls;
  }

  public promQueryString(): string {
    return `${this.metricName}{uniquename="${this.uniqueName}"}`;
  }

  public disableValidation(): void {
    this.postedFragmentsSinceLastValidate = undefined;
  }

  public enableValidation(): void {
    this.postedFragmentsSinceLastValidate = [];
  }

  public shouldBeValidated(): boolean {
    if (this.postedFragmentsSinceLastValidate === undefined) {
      return false;
    }
    return true;
  }

  private nextValue() {
    // Note: this ignores the compressability concept so far.
    // Math.random() is inclusive of 0, but not of 1.
    // Implement random walk without boundaries, and fixed step size.
    // TODO: make step size a parameter (currently 0.1)
    if (Math.random() >= 0.5) {
      this.lastValue = this.lastValue + 0.1;
    } else {
      this.lastValue = this.lastValue - 0.1;
    }
    return this.lastValue;
  }

  protected nextSample(): MetricSample {
    this.millisSinceEpochOfLastGeneratedSample =
      this.millisSinceEpochOfLastGeneratedSample.add(
        this.metrics_time_increment_ms
      );

    return new MetricSample(
      this.nextValue(),
      this.millisSinceEpochOfLastGeneratedSample
    );
  }

  public currentTimeRFC3339Nano(): string {
    // this is not the correct answer yet
    return this.millisSinceEpochOfLastGeneratedSample.toString(); // todo: ..
  }

  protected lastSampleSecondsSinceEpoch(): number {
    return this.millisSinceEpochOfLastGeneratedSample.divide(1000).toNumber();
  }

  protected leapForward(n: number): void {
    // invariant: this must not be called when `this.walltimeCouplingOptions`
    // is undefined.
    assert(this.walltimeCouplingOptions);
    this.millisSinceEpochOfLastGeneratedSample =
      this.millisSinceEpochOfLastGeneratedSample.add(n * 1000);
  }

  protected generateNextFragment(): MetricSeriesFragment {
    //const t0 = mtime();

    const f = new MetricSeriesFragment(
      this.labels,
      this.nFragmentsConsumed + 1,
      this
    );

    for (let i = 0; i < this.n_samples_per_series_fragment; i++) {
      f.addSample(this.nextSample());
    }

    //const genduration = mtimeDiffSeconds(t0);
    //log.debug(
    //  "MetricSeriesFragment addSample loop took: %s s",
    //  genduration.toFixed(3)
    //);

    this.nFragmentsConsumed += 1;
    return f;
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
      let fragment: MetricSeriesFragment;
      while (true) {
        const [shiftIntoPastSeconds, f] = this.generateNextFragmentOrSkip();
        if (f !== undefined) {
          fragment = f;
          break;
        }

        log.debug(
          `${this}: current lag compared to wall time ` +
            `(${shiftIntoPastSeconds.toFixed(1)} s)` +
            "is too small. Delay fragment generation."
        );
        await sleep(5);
      }

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
          // intermediate state: assume / know that there is _one_ fragment here.
          pm.fragments[0].sampleCount()
        );
      }
      await pm.postWithRetryOrError(cortexBaseUrl, 3, additionalHeaders);

      // drop actual samples (otherwise mem usage would grow quite fast).
      fragment.buildStatisticsAndDropData();

      // if this stream is marked to never be validated then don't collect
      // information about this fragment at all
      if (this.postedFragmentsSinceLastValidate !== undefined) {
        this.postedFragmentsSinceLastValidate.push(fragment);
      }
    }
  }

  // Most of FetchAndValidateOpts is ignored, just here to make this func
  // signature match DummyStream.fetchAndValidate
  public async fetchAndValidate(
    opts: MetricSeriesFetchAndValidateOpts
  ): Promise<number> {
    log.debug("%s fetchAndValidate()", this);

    let samplesValidated = 0;
    let fragmentsValidated = 0;

    // `this.postedFragmentsSinceLastValidate` is `undefined` if
    // `this.collectValidationInfo` was set to `false`.
    if (this.postedFragmentsSinceLastValidate === undefined) {
      return 0;
    }

    for (const fragment of this.postedFragmentsSinceLastValidate) {
      const validated = await this.fetchAndValidateFragment(fragment, opts);
      samplesValidated += validated;
      fragmentsValidated += 1;

      // Control log verbosity
      if (fragmentsValidated % 20 === 0) {
        log.debug(
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

  public dropValidationInfo(): void {
    this.postedFragmentsSinceLastValidate = [];
  }

  private queryParamsForFragment(fragment: MetricSeriesFragment) {
    // Confirm that fragment is 'closed' (serialized, has stats), and override
    // type from `LogStreamFragmentStats | MetricSeriesFragmentStats` to just
    // `MetricSeriesFragmentStats`.
    assert(fragment.stats);
    const stats = fragment.stats as MetricSeriesFragmentStats;

    // these query parameters implement the
    // instant-query-range-vector-selector-validation-method. also see ch1767
    // `timeMillisSinceEpochLast` is time timestamp (in ms since epoch) of the
    // last (rightmost) sample in the fragment.

    // the following validation is probably not necessary, but don't have the
    // brain power to be 100 % sure right now.
    if (!Number.isInteger(stats.timeMillisSinceEpochLast)) {
      log.error("not integer: %s", stats.timeMillisSinceEpochLast);
      throw new Error(
        "fragment.stats.timeMillisSinceEpochLast must be an integer value"
      );
    }

    // the `time` query parameter is a timestamp with 1s resolution (it is not
    // possible to define the right boundary with sub-second resolution). round
    // UP to the next full second. This is a noop when
    // `this.metrics_time_increment_ms` is n * 1000.

    const timeRightBoundarySeconds = Math.ceil(
      stats.timeMillisSinceEpochLast / 1000.0
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
    fragment: MetricSeriesFragment,
    opts: MetricSeriesFetchAndValidateOpts
  ): Promise<number> {
    // instant-query-range-vector-selector-validation-method
    const url = `${opts.querierBaseUrl}/api/v1/query`;

    const qparams = this.queryParamsForFragment(fragment);
    let headers: Record<string, string> = {};
    if (opts.additionalHeaders !== undefined) {
      headers = {
        ...headers,
        ...opts.additionalHeaders
      };
    }

    const gotRequestOptions = {
      retry: 0,
      throwHttpErrors: false,
      searchParams: qparams,
      headers: headers,
      timeout: httpTimeoutSettings,
      https: { rejectUnauthorized: false } // disable TLS verification for now
    };

    let response: GotResponse<string>;

    if (opts.customHTTPGetFunc !== undefined) {
      response = await opts.customHTTPGetFunc(url, gotRequestOptions);
    } else {
      // Super simple GET request method w/o retrying.
      response = await got(url, gotRequestOptions);
      if (response.statusCode != 200) logHTTPResponse(response);
    }

    // In case of the simple request handler above, this response might
    // represent an error response, and JSON-decoding might fail, or looking
    // update data.result might fail. That's expected.
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
    // code. If `metrics_time_increment_ms < 1000 then `timeRightBoundarySeconds`
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

    if (this.metrics_time_increment_ms.toNumber() < 1000) {
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

    const stats: MetricSeriesFragmentStats = {
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
