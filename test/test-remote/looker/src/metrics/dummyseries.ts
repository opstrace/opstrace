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

import { ZonedDateTime, ZoneOffset } from "@js-joda/core";
import got, { Response as GotResponse } from "got";
import Long from "long";

import { logqlLabelString } from "../logs";

import { mtimeDiffSeconds, mtime, sleep } from "../mtime";
import { log } from "../log";
import { logHTTPResponse, httpTimeoutSettings } from "../util";

import * as mathjs from "mathjs";

import {
  MetricSample,
  TimeseriesFragment,
  FragmentStatsMetrics,
  formatFloatForComp
} from "./index";

import { TimeseriesBase, LabelSet } from "../series";

export interface DummyTimeseriesMetricsOpts {
  metricName: string;
  starttime: ZonedDateTime;
  uniqueName: string;
  labelset: LabelSet | undefined;
  timediffMilliSeconds: number;
  // don't use timediff.. but use wall time instead
  useWallTime?: boolean;
  n_samples_per_series_fragment: number;
}

export interface DummyTimeseriesFetchAndValidateOpts {
  querierBaseUrl: string;
  additionalHeaders?: Record<string, string>;
  chunkSize?: number;
  inspectEveryNthEntry?: number | undefined;
  customHTTPGetFunc?: (
    url: string,
    gotRequestOptions: any
  ) => Promise<GotResponse<string>>;
}

// Maybe rename to DummySeriesMetrics
// or LookerSeriesMetrics or ...MetricSeries
export class DummyTimeseries extends TimeseriesBase {
  private millisSinceEpochOfLastGeneratedSample: Long;
  private timediffMilliseconds: Long;
  private fragmentWidthSecondsForQuery: BigInt;
  private lastValue: number;
  //Supposed to contain a prometheus counter object, providing an inc() method.
  private counterForwardLeap: any | undefined;

  metricName: string;
  nFragmentsSuccessfullySentSinceLastValidate: number;

  // `undefined` means: do not collect validation info; this is so
  // that we ideally save memory
  postedFragmentsSinceLastValidate: Array<TimeseriesFragment> | undefined;

  constructor(opts: DummyTimeseriesMetricsOpts, counterForwardLeap?: any) {
    super(opts);
    this.metricName = opts.metricName;

    this.postedFragmentsSinceLastValidate = undefined;

    // Initialize to 0 here, gets properly initialized conditionally in
    // this.processOptionsForSyntheticTimesource() below
    this.fragmentWidthSecondsForQuery = BigInt(0);

    this.counterForwardLeap = undefined;

    // Do q&n validation of this object -- not neede when using wall time
    // as a time source, can be cleaned up.
    if (counterForwardLeap !== undefined) {
      this.counterForwardLeap = counterForwardLeap;
      if (counterForwardLeap.inc === undefined) {
        throw new Error(
          "the counterForwardLeap arg needs to have an `inc()` method"
        );
      }
    }

    if (!this.useWallTime) {
      // when using wall time, things get much more simple
      this.processOptionsForSyntheticTimesource(opts);
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

  private processOptionsForSyntheticTimesource(
    opts: DummyTimeseriesMetricsOpts
  ) {
    if (opts.starttime.nano() != 0) {
      throw new Error("start time must not have fraction of seconds");
    }

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

    // Calculate how much later the last sample of the next fragment would be
    // compare to the last sample of the previous fragment. Do not do
    // (opts.n_samples_per_series_fragment-1) because this time width is
    // actually compared to the last sample in the previous fragment
    const maxTimeLeapComparedToPreviousFragmentSeconds =
      (opts.n_samples_per_series_fragment * opts.timediffMilliSeconds) / 1000;
    if (maxTimeLeapComparedToPreviousFragmentSeconds >= 10 * 60) {
      throw new Error(
        "a single fragment may cover 10 minutes worth of data. " +
          "That may put us too far into the future. Reduce sample count in a " +
          "fragment or reduce time between samples."
      );
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
  }

  protected buildLabelSetFromOpts(opts: DummyTimeseriesMetricsOpts): LabelSet {
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

  private nextSampleFromWalltime(): MetricSample {
    // In JavaScript, `new Date().valueOf()` seems to be the way to get
    // milliseconds since epoch, as a `number` type. Shift us 20 minutes into
    // the past compared to _actual_ wall time ( 20 * 60 * 1000 milliseconds)
    // because we must note overtake the walltime of the receiving end and any
    // real-world metrics ingestion system receives metrics _from the past_
    // (sometimes maybe just 30 seconds old, sometimes various minutes old --
    // make this delay configurable. needs to be tuned against the
    // write-into-the-future protection time constants below).
    let newSamplemillisSinceEpoch = Long.fromNumber(
      new Date().valueOf() - 1200000
    );

    // If we are too fast (generating more than one sample within the same
    // millisecond of wall time) then artificially add the smallest required
    // difference -- which is 1 millisecond (defined by Prometheus data
    // structures). Via this mechanism we might actually be faster than wall
    // time. and end up having a rather synthetic time source again. It's up to
    // the caller / user to choose parameters so that
    // `nextSampleFromWalltime()` is not called more than once per T. T can be,
    // depending on the goals: 1 ms, 1 s, 1 minute, ... For obtaining a
    // realistic write load guided by wall time with a predictable _largish_
    // time difference between adjacent samples it might make sense to use
    // the existing approach.
    if (
      this.millisSinceEpochOfLastGeneratedSample >= newSamplemillisSinceEpoch
    ) {
      newSamplemillisSinceEpoch = this.millisSinceEpochOfLastGeneratedSample.add(
        1
      );
    }

    return new MetricSample(
      this.nextValue(),
      this.millisSinceEpochOfLastGeneratedSample
    );
  }

  protected nextSample(): MetricSample {
    this.millisSinceEpochOfLastGeneratedSample = this.millisSinceEpochOfLastGeneratedSample.add(
      this.timediffMilliseconds
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

  /**
   * When the time of the last sample in the last generated fragment has fallen
   * behind too far compared to the current wall time, this method can be used
   * to make the first sample of the next fragment to be generated be closer to
   * the current wall time again.
   *
   * If this method ever needs to be called externally, it should be called
   * between two calls to `generateAndGetNextFragment()`. For now it is a
   * private method and is called at the beginning of the implementation of
   * `generateNextFragment()`.
   *
   * ## Background
   *
   * With the Cortex Blocks Storage engine, we cannot push samples that go into
   * the future (compared to wall time in the ingest system), and we also
   * cannot push samples that are older than 1 hour compared to the wall time
   * in the ingest system. In both cases, Cortex rejects these samples.
   *
   * Context: https://github.com/opstrace/opstrace-corp/issues/147 and
   * https://github.com/cortexproject/cortex/issues/2366.
   *
   * The challenge: for deep read validation we need to _know_ the timestamps
   * for individual metric samples that were written into the remote storage
   * system. Keeping them all in memory is not an option towards validation,
   * i.e. they need to follow a predictable pattern. That is, they can't be
   * consumed from a clock source of this machine, but they need to be
   * generated synthetically, following said pattern. The simple pattern being
   * used here: adjacent timestamps in the synthetically generated samples have
   * a fixed time distance between them (`this.timediffMilliseconds`).
   *
   * Now, during execution, this synthetic generation of timestamps, is either
   * faster or slower than the evolution of the actual time. This depends on
   * many factors, but certainly on the user-given choice of
   * `this.timediffMilliseconds`.
   *
   * This method here provides a correction for one of both cases: when the
   * synthetic clock source evolves _slower_ than wall time, i.e. when it
   * slowly falls behind. When it has fallen behind by a specific amount, it
   * leaps the synthetic time source forward by a particular correction amount.
   *
   * Also note: this strategy makes use of the fact that fragments are
   * validated _individually_ based on their first and last sample's
   * timestamps, i.e. the leap forward is done _between_ fragments, and not
   * _within_ an individual fragment.
   */
  private bringCloserToWalltimeIfFallenBehind(): number {
    const lastSampleSecondsSinceEpoch = this.millisSinceEpochOfLastGeneratedSample
      .divide(1000)
      .toNumber();

    const nowSecondsSinceEpoch = ZonedDateTime.now(
      ZoneOffset.UTC
    ).toEpochSecond();

    // How much is the timestamp of the last generated sample lagging behind
    // "now"? This is a positive number, and the larger it is the larger is the
    // gap.
    const shiftIntoPastSeconds =
      nowSecondsSinceEpoch - lastSampleSecondsSinceEpoch;

    // Can of course also be negative, meaning `lastSampleSecondsSinceEpoch` is
    // in the future compared to wall time. This state is not allowed.
    if (shiftIntoPastSeconds < 0) {
      // The last sample of the last fragment generated is in the future
      // compared to current wall time. We should never get here, this is the
      // whole point. This can happen as of a bug in looker or as of wall time
      // changing unexpectedly around us. Either should be fatal (lead up to a
      // crash).
      throw new Error(
        `${this}: shiftIntoPastSeconds < 0: ${shiftIntoPastSeconds.toFixed(
          4
        )} -- lastSampleSecondsSinceEpoch: ${lastSampleSecondsSinceEpoch.toFixed(
          4
        )} -- nowSecondsSinceEpoch: ${nowSecondsSinceEpoch.toFixed(4)}`
      );
    }

    // If we've fallen behind by more than e.g. 40 minutes, forward by e.g. 20
    // minutes (note that as of time of writing this comment, a DummyTimeseries
    // starts ~30 minutes behind wall time). These numbers are adjusted to the
    // 1-hour ingest window provided by Cortex with the blocks storage engine.
    // TODO: expose these parameters to users via CLI -- might also be nice to
    // set them rather tight, i.e. to leap forward by just a little bit when
    // falled behind just a little bit.
    const maxLagMinutes = 40;
    const leapForwardMinutes = 5;

    if (shiftIntoPastSeconds > maxLagMinutes * 60) {
      log.debug("%s: leaped forward by %s minutes", this, leapForwardMinutes);
      this.millisSinceEpochOfLastGeneratedSample = this.millisSinceEpochOfLastGeneratedSample.add(
        leapForwardMinutes * 60 * 1000
      );

      // TODO: allow for injecting a counter (e.g., a Prometheus counter)
      // so that when this happens there is a way to do bookkeeping about it.
      //return -leapForwardMinutes;
      if (this.counterForwardLeap !== undefined) {
        this.counterForwardLeap.inc();
      }

      // Return the _updated_ shift-into-past.
      return shiftIntoPastSeconds - leapForwardMinutes * 60;
    } else {
      if (
        this.nFragmentsConsumed > 0 &&
        this.nFragmentsConsumed % 10000 === 0
      ) {
        const m = shiftIntoPastSeconds / 60.0;
        // too noisy for large stream count.
        log.debug("%s: lag behind walltime: %s minutes", this, m.toFixed(1));
      }
    }

    // return 0 or positive number: this is the current lag in seconds compared
    // to walltime, specifically _behind_ walltime.
    return shiftIntoPastSeconds;
  }

  // no stop criterion: dummyseries is an infinite concept (definite start, it
  // indefinite end) -- the caller decides how many fragments to generate.
  protected generateNextFragment(): [number, TimeseriesFragment | undefined] {
    // TODO: this might get expensive, maybe use a monotonic time source
    // to make sure that we call this only once per minute or so.
    const shiftIntoPastSeconds = this.bringCloserToWalltimeIfFallenBehind();

    // Start building a criterion that allows artificial throttling, and that
    // prevents this time series to get dangerously close to 'now', which also
    // prevents it from going into the future (at least, when the time width
    // between the oldest and newest sample in a single fragment is not lager
    // than this interval -- assuming that this check is only ever done between
    // generating two fragments. This should not happen as of the
    // maxTimeLeapComparedToPreviousFragmentSeconds check above
    const minLagMinutes = 10;

    // Behind wall time, but too close to wall time. Do not actually generate a
    // new fragment. Work with the guarantee/assumption that
    // `shiftIntoPastSeconds >= 0`.
    if (shiftIntoPastSeconds < minLagMinutes * 60) {
      return [shiftIntoPastSeconds, undefined];
    }

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
    return [shiftIntoPastSeconds, fragment];
  }

  public generateAndGetNextFragment(): [
    number,
    TimeseriesFragment | undefined
  ] {
    const [shiftIntoPastSeconds, seriesFragment] = this.generateNextFragment();
    if (seriesFragment !== undefined) {
      this.nFragmentsConsumed += 1;
    }
    return [shiftIntoPastSeconds, seriesFragment];
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
      let fragment: TimeseriesFragment;
      while (true) {
        const [shiftIntoPastSeconds, f] = this.generateAndGetNextFragment();
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
    opts: DummyTimeseriesFetchAndValidateOpts
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

  private queryParamsForFragment(fragment: TimeseriesFragment) {
    // Confirm that fragment is 'closed' (serialized, has stats), and override
    // type from `LogStreamFragmentStats | FragmentStatsMetrics` to just
    // `FragmentStatsMetrics`.
    assert(fragment.stats);
    const stats = fragment.stats as FragmentStatsMetrics;

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
    // `this.timediffMilliseconds` is n * 1000.

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
    fragment: TimeseriesFragment,
    opts: DummyTimeseriesFetchAndValidateOpts
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

    const stats: FragmentStatsMetrics = {
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
