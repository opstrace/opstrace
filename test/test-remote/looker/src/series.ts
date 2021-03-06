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

import { ZonedDateTime } from "@js-joda/core";

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

export interface LabelSet {
  [key: string]: string;
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

export abstract class TimeseriesBase {
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

  n_entries_per_stream_fragment: number;
  uniqueName: string;
  // To make things absolutely unambiguous allow for the consumer to set the
  // last fragment consumed via this method.
  lastFragmentConsumed: MetricSeriesFragment | LogSeriesFragment | undefined;

  constructor(opts: LogSeriesOpts | MetricSeriesOpts) {
    this.nFragmentsConsumed = 0;
    this.starttime = opts.starttime;
    this.uniqueName = opts.uniqueName;
    this.optionstring = `${JSON.stringify(opts)}`;
    this.labels = this.buildLabelSetFromOpts(opts);
    this.n_entries_per_stream_fragment = opts.n_entries_per_stream_fragment;
    this.nSamplesValidatedSoFar = BigInt(0);
  }

  protected abstract buildLabelSetFromOpts(
    opts: LogSeriesOpts | MetricSeriesOpts
  ): LabelSet;

  abstract disableValidation(): void;

  abstract enableValidation(): void;

  abstract shouldBeValidated(): boolean;

  abstract dropValidationInfo(): void;

  abstract currentTimeRFC3339Nano(): string;

  abstract generateAndGetNextFragment():
    | [number, MetricSeriesFragment | undefined]
    | LogSeriesFragment;

  protected abstract nextSample(): LogSample | MetricSample;

  protected abstract generateNextFragment():
    | [number, MetricSeriesFragment | undefined]
    | LogSeriesFragment;

  abstract fetchAndValidate(
    opts: MetricSeriesFetchAndValidateOpts | LogSeriesFetchAndValidateOpts
  ): Promise<number>;

  public toString(): string {
    // does this use the name of the extension class, instead of the name
    // of the base class? that's the goal here, let's see.
    return `${this.constructor.name}(opts=${this.optionstring})`;
  }
}
