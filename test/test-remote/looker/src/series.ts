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

import { strict as assert } from "assert";

import { ZonedDateTime, ZoneOffset } from "@js-joda/core";

import {
  LogSeriesOpts,
  LogSeriesFragment,
  LogSample,
  LogSeriesFetchAndValidateOpts,
  LogSeriesFragmentStats
} from "./logs";

import {
  MetricSeriesOpts,
  MetricSeriesFragment,
  MetricSample,
  MetricSeriesFetchAndValidateOpts,
  MetricSeriesFragmentStats
} from "./metrics";

import { log } from "./log";

export interface LabelSet {
  [key: string]: string;
}

export interface WalltimeCouplingOptions {
  maxLagSeconds: number;
  minLagSeconds: number;
}

export interface FragmentStatsBase {
  // Use BigInt to stress that this is never fractional -- worry about perf
  // later.
  sampleCount: bigint;
}

export abstract class SampleBase<ValueType, TimeType> {
  public value: ValueType;
  public time: TimeType;

  constructor(value: ValueType, time: TimeType) {
    this.value = value;
    this.time = time;
  }
}

export abstract class FragmentBase<SampleType, ParentType> {
  /** The label set defining the time series this fragment is part of. */
  public labels: LabelSet;

  /** The individual samples in this time series fragment */
  protected samples: Array<SampleType>;

  /** Sequential number for locating fragment in the time series. Set by caller. */
  public index: number;

  /** The time series that this fragment is part of (the "parent"). */
  public parent: ParentType | undefined;

  /**
   * An object representing the samples in this fragment -- is built upon
   * serialization, i.e. when this.serialized is `true` -- in the
   * implementation, make sure this is built once and not changed afterwards
   */
  public stats: LogSeriesFragmentStats | MetricSeriesFragmentStats | undefined;

  /**
   * For internal book-keeping: is this 'closed' (has been serialized, no more
   * samples can be added) or can samples still be added?
   */
  protected serialized: boolean;

  /**
   * Return number of payload bytes in this fragment.
   *
   * For a Prometheus metric sample, that's a double precision float (8 bytes)
   * for sample value, and an int64 per sample timestamp, i.e. 16 bytes per
   * sample.
   *
   * For a Loki log sample, that's a protobuf timestamp (int64 + int32) per
   * sample (12 bytes), and the size of the sample value text encoded as UTF-8.
   */
  abstract payloadByteCount(): bigint;

  constructor(
    labels: LabelSet,
    index = 0,
    parentSeries: ParentType | undefined = undefined
  ) {
    this.labels = labels;
    this.samples = new Array<SampleType>();
    this.index = index;
    this.parent = parentSeries;
    this.serialized = false;
  }

  /**
   * Return shallow copy so that mutation of the returned array does not have
   * side effects in here. However, if individual samples were to be mutated
   * this would take effect here, too.*/
  public getSamples(): Array<SampleType> {
    return [...this.samples];
  }

  /**
   * Return the current number of samples in this fragment.
   * Type `bigint` to stress that this is never fractional.
   */
  public sampleCount(): bigint {
    // This might not be well thought through, but when the `stats` property is
    // populated then this fragment is "closed" (no more sampled should/can be
    // added) and the actual data might be gone (consolidate this thinking!).
    if (this.stats !== undefined) {
      return this.stats.sampleCount;
    }
    return BigInt(this.samples.length);
  }

  /** Return stringified and zero-padded index. */
  public indexString(length: number): string {
    const is: string = this.index.toString();
    return is.padStart(length, "0");
  }

  public addSample(s: SampleType): void {
    if (this.serialized) {
      throw new Error("cannot mutate fragment anymore");
    }
    this.samples.push(s);
    // I hope the compiler after all removes all overhead when it sees that
    // `addSampleHook()` is a noop.
    this.addSampleHook(s);
  }

  /**
   * Use this to indicate that this fragment was serialized (into a binary
   * msg) out-of-band, i..e not with the `serialize()` method.
   */
  public setSerialized(): void {
    this.serialized = true;
  }

  /**
   * Can be used in the child to execute custom functionality when adding a
   * sample.
   */
  protected abstract addSampleHook(s: SampleType): void;
}

export abstract class TimeseriesBase<FragmentType> {
  /** The label set (set of key/value pairs) which uniquely defines this time
   * series*/
  protected labels: LabelSet;

  /** The start time of this synthetic time series (note(jp): does first sample
   * have this value? might depend on log vs. metrics implementation) */
  protected starttime: ZonedDateTime;

  /** The set of options configuring this time series -- serialized into a
   * string */
  protected optionstring: string;

  /** The number of fragments consumed from this time series -- for
   * book-keeping purposes. */
  protected nFragmentsConsumed: number;

  /** For keeing track of how many entries were validated (from the start of the
   *stream). Used by fetchAndValidate(). */
  protected nSamplesValidatedSoFar: bigint;

  /**
   * Configure 'walltime coupling' where the synthetic time source is loosely
   * coupled to the wall time.
   *
   * `undefined`: disable this mechanism. can fall back into the past
   * arbitrarily far, and go into the future arbitrarily far. Not expected to
   * work for metrics (cortex, blocks storage) -- may work for logs (loki, also
   * see reject_old_samples option and discussion in
   * https://github.com/opstrace/opstrace/pull/1140#discussion_r679837228)
   */
  protected walltimeCouplingOptions: WalltimeCouplingOptions | undefined;

  // Supposed to contain a prometheus counter object, providing an inc() method.
  protected counterForwardLeap: any | undefined;

  /**
   * Fragment time leap, defined as the time difference between the last sample
   *  of a fragment and the last sample of the previous fragment.
   */
  fragmentTimeLeapSeconds: number;

  // `undefined` means: do not collect validation info; this is so
  // that we ideally save memory
  postedFragmentsSinceLastValidate: Array<FragmentType> | undefined;

  sample_time_increment_ns: number;
  n_samples_per_series_fragment: number;
  uniqueName: string;
  // To make things absolutely unambiguous allow for the consumer to set the
  // last fragment consumed via this method.
  // lastFragmentConsumed: FragmentType | undefined;
  lastFragmentConsumed: LogSeriesFragment | MetricSeriesFragment | undefined;

  constructor(opts: LogSeriesOpts | MetricSeriesOpts) {
    this.nFragmentsConsumed = 0;
    this.starttime = opts.starttime;
    this.uniqueName = opts.uniqueName;
    this.optionstring = `${JSON.stringify(opts)}`;
    this.labels = this.buildLabelSetFromOpts(opts);
    this.n_samples_per_series_fragment = opts.n_samples_per_series_fragment;
    this.sample_time_increment_ns = opts.sample_time_increment_ns;
    this.nSamplesValidatedSoFar = BigInt(0);
    this.walltimeCouplingOptions = opts.wtopts;

    this.postedFragmentsSinceLastValidate = undefined;

    if (!Number.isInteger(opts.sample_time_increment_ns)) {
      throw new Error("sample_time_increment_ns must be an integer value");
    }

    // Calculate fragment time leap (think: by how much the internal time is
    // forward-leaped by the next call to generateNextFragment()).
    //
    // Important distinction:
    // - fragment time width, defined as the time difference between the first
    //   and last sample in the fragment, and equal to
    //   (n_samples_per_series_fragment - 1) * delta_t
    // - fragment time leap, defined as the time difference between the last
    //   sample of a fragment and the last sample of the previous fragment,
    //   equal to (n_samples_per_series_fragment) * delta_t

    this.fragmentTimeLeapSeconds =
      this.n_samples_per_series_fragment *
      (this.sample_time_increment_ns / 10 ** 6);

    this.validateWtOpts(opts.wtopts);

    if (opts.counterForwardLeap !== undefined) {
      this.counterForwardLeap = opts.counterForwardLeap;
      if (opts.counterForwardLeap.inc === undefined) {
        throw new Error(
          "the counterForwardLeap obj needs to have an `inc()` method"
        );
      }
    }
  }

  protected abstract buildLabelSetFromOpts(
    opts: LogSeriesOpts | MetricSeriesOpts
  ): LabelSet;

  abstract disableValidation(): void;

  abstract enableValidation(): void;

  abstract shouldBeValidated(): boolean;

  abstract dropValidationInfo(): void;

  abstract currentTimeRFC3339Nano(): string;

  abstract promQueryString(): string;

  protected abstract nextSample(): LogSample | MetricSample;

  protected abstract generateNextFragment(): FragmentType;
  // | LogSeriesFragment
  // | MetricSeriesFragment;

  /**
   * Return floating point number representing the timestamp of the last sample
   * in "seconds since epoch". It is OK to potentially have less absolute
   * precision as compared to the internal time-keeping variables (can't fit
   * nanosecond resolution for a wide date range into double precision float,
   * which is why for log series the prometheus ecosystem tracks seconds and
   * the fractional part in nanoseconds in two separate variables).
   */
  protected abstract lastSampleSecondsSinceEpoch(): number;

  /**
   * Leap forward by N seconds.
   *
   * Must only be called after just having completed a fragment (right?).
   */
  protected abstract leapForward(n: bigint): void;

  // abstract fetchAndValidate(
  //   opts: MetricSeriesFetchAndValidateOpts | LogSeriesFetchAndValidateOpts
  // ): Promise<number>;

  protected abstract fetchAndValidateFragment(
    fragment: FragmentType,
    opts: MetricSeriesFetchAndValidateOpts | LogSeriesFetchAndValidateOpts
  ): Promise<number>;

  public toString(): string {
    // does this use the name of the extension class, instead of the name
    // of the base class? that's the goal here, let's see.
    // Optionsstring might be a little too long.
    //return `${this.constructor.name}(opts=${this.optionstring})`;
    return `${this.constructor.name}(${this.promQueryString()})`;
  }

  protected validateWtOpts(o: WalltimeCouplingOptions | undefined): void {
    if (o === undefined) {
      return;
    }

    // I was unable to do this with a for loop based on a static set of
    // strings or using `for (const key in obj)` -- always a type error.
    // Huh.
    assert(Number.isInteger(o["minLagSeconds"]));
    assert(Number.isInteger(o["maxLagSeconds"]));

    // The walltime coupling mechanism wants to make sure that all samples in a
    // fragment have timestamps from the 'green zone', a time interval that is
    // "allowed", by definition. The lower and upper bound of that interval are
    // defined by wall time and the max/minLagSeconds. When the time width of a
    // fragment is larger than this interval then the walltime coupling
    // mechanism would oscillate between leaping forward and throttling, and
    // never send data. That's effectively a deadlock :). I got here by using
    // static min/maxLagSeconds settings. Next up: calculate maxLagSeconds
    // dynamically based on the fragment time width / fragmentTimeLeapSeconds
    // (difference does not matter much when using leeway).
    if (o.maxLagSeconds <= this.fragmentTimeLeapSeconds) {
      throw new Error("maxLagSeconds <= fragmentTimeLeapSeconds");
    }

    // if (mtls >= o["minLagSeconds"]) {
    //   throw new Error(
    //     "a single series fragment may cover " +
    //       (mtls / 60.0).toFixed(2) +
    //       "minute(s) worth of data. That may put us too far into the " +
    //       "future. Reduce sample count per fragment or reduce " +
    //       "time between samples."
    //   );
    // }
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
   * a fixed time distance between them (`this.metrics_time_increment_ms`).
   *
   * Now, during execution, this synthetic generation of timestamps, is either
   * faster or slower than the evolution of the actual time. This depends on
   * many factors, but certainly on the user-given choice of
   * `this.metrics_time_increment_ms`.
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
  protected bringCloserToWalltimeIfFallenBehind(): number {
    // invariant: this must not be called when `this.walltimeCouplingOptions`
    // is undefined.
    assert(this.walltimeCouplingOptions);

    const lastSampleSecondsSinceEpoch = this.lastSampleSecondsSinceEpoch();

    const nowSecondsSinceEpoch = ZonedDateTime.now(
      ZoneOffset.UTC
    ).toEpochSecond();

    // How much is the timestamp of the last generated sample lagging behind
    // "now"? This is a positive number, and the larger it is the larger is the
    // gap. Define this as "lag" (unit: seconds) -- TODO: rename vars
    // accordingly
    const shiftIntoPastSeconds =
      nowSecondsSinceEpoch - lastSampleSecondsSinceEpoch;

    // Can theoretically also be negative, meaning
    // `lastSampleSecondsSinceEpoch` is in the future compared to wall time.
    // This state is not allowed. In remaining parts of the program the
    // `shiftIntoPastSeconds >= 0` is treated as an invariant (a guarantee
    // being relied upon).
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

    // If we've fallen behind by more than
    // `walltimeCouplingOptions.maxLagSeconds` then leap forward to _almost_
    // the the right end of the interval [now-wcp.maxLagSeconds,
    // now-wcp.minLagSeconds]. TODO: maybe expose these parameters to users via
    // CLI -- maybe also set the defaults 'rather tight', i.e. leap forward by
    // just a little bit when fallen  behind just a little bit.

    if (shiftIntoPastSeconds > this.walltimeCouplingOptions.maxLagSeconds) {
      // Do Math.floor() to make this be an integer value
      const secondsToLeapForward = BigInt(
        Math.floor(
          shiftIntoPastSeconds - this.walltimeCouplingOptions.minLagSeconds - 5
        )
      );

      const lfm = Number(secondsToLeapForward) / 60;
      log.debug(`${this}: leap forward by ${lfm.toFixed(2)} minutes`);

      // rely on the implementation here to actually leap by the amount that
      // we just logged, and that we're going to use to build the return
      // value below
      this.leapForward(secondsToLeapForward);

      // Increment Prometheus metric counter if that was provided.
      if (this.counterForwardLeap !== undefined) {
        this.counterForwardLeap.inc();
      }

      // Return the _updated_ shift-into-past.
      return shiftIntoPastSeconds - lfm * 60;
    }

    // The current lag is within expected bounds.
    if (this.nFragmentsConsumed > 0 && this.nFragmentsConsumed % 10000 === 0) {
      // Log current lag (sometimes -- but this is not a great, useful
      // solution)
      const m = shiftIntoPastSeconds / 60.0;
      // too noisy for large stream count.
      log.debug("%s: lag behind walltime: %s minutes", this, m.toFixed(1));
    }

    // return 0 or positive number: this is the current lag in seconds compared
    // to walltime, specifically _behind_ walltime.
    return shiftIntoPastSeconds;
  }

  public generateNextFragmentOrSkip(): [number, FragmentType | undefined] {
    if (this.walltimeCouplingOptions === undefined) {
      // walltime coupling disabled, return meaningless -1 to comply with
      // interface
      return [-1, this.generateNextFragment()];
    }

    // TODO: this might get expensive, maybe use a monotonic time source
    // to make sure that we call this only once per minute or so.
    const shiftIntoPastSeconds = this.bringCloserToWalltimeIfFallenBehind();

    // A pragmatic criterion allowing for artificial throttling. Only generate
    // the next fragment if after fragment generation the internal time source
    // is still in the past compared to current walltime, with a _guaranteed_
    // leeway of `minLagSeconds` as given by the `walltimeCouplingOptions`.
    // This mechanism prevents this time series to get dangerously close to
    // 'now'; which implies that it also does not go into the future. This is
    // useful when the remote system that receives samples from this source
    // (which has its own perspective on wall time) must not receive samples
    // from the future.
    if (
      shiftIntoPastSeconds - this.fragmentTimeLeapSeconds >
      this.walltimeCouplingOptions.minLagSeconds
    ) {
      // When generating a new fragment then the current shift into the past
      // (the 'lag') is not the value we just got, but we've advanced by a
      // known amount: the fragmentTimeLeapSeconds -- add that.
      return [
        shiftIntoPastSeconds + this.fragmentTimeLeapSeconds,
        this.generateNextFragment()
      ];
    }

    // Behind wall time, but too close to wall time. Do not generate a new
    // fragment.
    return [shiftIntoPastSeconds, undefined];
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
}
