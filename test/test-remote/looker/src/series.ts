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
  DummyStreamOpts,
  LogStreamFragment,
  LogSampleTimestamp,
  LogSample,
  DummyStreamFetchAndValidateOpts,
  LogStreamFragmentStats
} from "./logs";

import {
  DummyTimeseriesMetricsOpts,
  DummyTimeseriesFetchAndValidateOpts,
  TimeseriesFragment,
  MetricSample,
  FragmentStatsMetrics
} from "./metrics";

export interface LabelSet {
  [key: string]: string;
}

export abstract class SampleBase {
  abstract value: number | string;
  abstract time: Long | LogSampleTimestamp;
}

export abstract class FragmentBase<SampleType> {
  /** The label set defining the time series this fragment is part of. */
  public labels: LabelSet;
  /** Sequential number for locating fragment in the time series. Set by caller. */
  public index: number;
  public parent: TimeseriesBase | undefined;
  public stats: LogStreamFragmentStats | FragmentStatsMetrics | undefined;

  protected samples: Array<SampleType>;
  protected serialized: boolean;

  constructor(
    labels: LabelSet,
    index = 0,
    parentSeries: TimeseriesBase | undefined = undefined
  ) {
    this.labels = labels;
    // new Array<TimeseriesSample>();
    this.samples = new Array<SampleType>();
    this.index = index;
    this.parent = parentSeries;
    this.serialized = false;
  }

  /** Return the current number of samples in this fragment.
   * Type `bigint` to stress that this is never fractional.
   */
  sampleCount(): bigint {
    // This might not be well thought through, but when the `stats` property is
    // populated then this fragment is "closed" (no more sampled should/can be
    // added) and the actual data might be gone (consolidate this thinking!).
    if (this.stats !== undefined) {
      return this.stats.sampleCount;
    }
    return BigInt(this.samples.length);
  }
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

  n_samples_per_series_fragment: number;
  uniqueName: string;
  // To make things absolutely unambiguous allow for the consumer to set the
  // last fragment consumed via this method.
  lastFragmentConsumed: TimeseriesFragment | LogStreamFragment | undefined;

  constructor(opts: DummyStreamOpts | DummyTimeseriesMetricsOpts) {
    this.nFragmentsConsumed = 0;
    this.starttime = opts.starttime;
    this.uniqueName = opts.uniqueName;
    this.optionstring = `${JSON.stringify(opts)}`;
    this.labels = this.buildLabelSetFromOpts(opts);
    this.n_samples_per_series_fragment = opts.n_samples_per_series_fragment;
    this.nSamplesValidatedSoFar = BigInt(0);
  }

  protected abstract buildLabelSetFromOpts(
    opts: DummyStreamOpts | DummyTimeseriesMetricsOpts
  ): LabelSet;

  abstract disableValidation(): void;

  abstract enableValidation(): void;

  abstract shouldBeValidated(): boolean;

  abstract dropValidationInfo(): void;

  abstract currentTimeRFC3339Nano(): string;

  abstract generateAndGetNextFragment():
    | [number, TimeseriesFragment | undefined]
    | LogStreamFragment;

  protected abstract nextSample(): LogSample | MetricSample;

  protected abstract generateNextFragment():
    | [number, TimeseriesFragment | undefined]
    | LogStreamFragment;

  abstract fetchAndValidate(
    opts: DummyTimeseriesFetchAndValidateOpts | DummyStreamFetchAndValidateOpts
  ): Promise<number>;

  public toString(): string {
    // does this use the name of the extension class, instead of the name
    // of the base class? that's the goal here, let's see.
    return `${this.constructor.name}(opts=${this.optionstring})`;
  }
}
