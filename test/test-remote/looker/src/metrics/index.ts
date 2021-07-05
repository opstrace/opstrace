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

import crypto from "crypto";

import protobuf from "protobufjs";
import snappy from "snappy";
import got from "got";
import Long from "long";

import * as mathjs from "mathjs";

import { mtimeDiffSeconds, mtime, sleep } from "../mtime";
import { log } from "../log";
import { logHTTPResponseLight, logHTTPResponse } from "../util";

import { MetricSeries } from "./dummyseries";

import { SampleBase, FragmentBase, FragmentStatsBase } from "../series";

export * from "./dummyseries";

const pbfRoot = protobuf.loadSync(
  `${__dirname}/../resources/promproto_bundle.json`
);

const pbTypeWriterequest = pbfRoot.lookupType("prometheus.WriteRequest");
const pbTypeTimeseries = pbfRoot.lookupType("prometheus.TimeSeries");
const pbTypeSample = pbfRoot.lookupType("prometheus.Sample");
const pbTypeLabel = pbfRoot.lookupType("prometheus.Label");

export interface MetricSeriesFragmentStats extends FragmentStatsBase {
  timeMillisSinceEpochFirst: number;
  timeMillisSinceEpochLast: number;
  min: string;
  max: string;
  var: string;
}

/**
 * The metric sample value, i.e. a floating point number The metric sample
 * timestamp which is an int64 in the Prometheus protobuf world -- representing
 * milliseconds since epoch -- here, for the NodeJS runtime we use a `Long`
 * from the `long` library to keep the integer arithmetics. */
export class MetricSample extends SampleBase<number, Long> {}

export class MetricSeriesFragment extends FragmentBase<
  MetricSample,
  MetricSeries
> {
  /*
  Return number of payload bytes. For a Prometheus metric sample, that's
  adouble-precision float (64 bit, 8 Bytes) per metric value, and an int64
  (also 8 Bytes) per metric timestamp.

  https://github.com/prometheus/prometheus/blob/90976e7505c225a44d4f0d4b6978f2b42fe0dcb8/prompb/types.proto#L45

  That is, 16 Bytes per sample.
  */
  public payloadByteCount(): bigint {
    if (this.stats !== undefined) {
      return this.stats.sampleCount * BigInt(16);
    }

    return BigInt(this.samples.length) * BigInt(16);
  }

  public buildStatisticsAndDropData(): void {
    if (!this.serialized) {
      throw new Error("not yet serialized");
    }

    const values = [];
    for (const sample of this.samples) {
      values.push(sample.value);
    }

    const stats = {
      min: formatFloatForComp(mathjs.min(values)),
      max: formatFloatForComp(mathjs.max(values)),
      var: formatFloatForComp(mathjs.variance(values)),
      timeMillisSinceEpochFirst: this.samples[0].time.toNumber(), // NOTE: warning, ignorant conversion for now
      timeMillisSinceEpochLast: this.samples.slice(-1)[0].time.toNumber(),
      sampleCount: BigInt(values.length)
    };
    this.stats = stats;
    // log.info("fragmentStat right after generate: %s", stats);

    // drop main payload data
    // see https://stackoverflow.com/a/1232046/145400
    this.samples.length = 0;
    this.stats = stats;
  }

  // Must be implemented, but make this a noop. I trust that the compiler
  // after all removes all overhead.
  protected addSampleHook(): void {
    return;
  }

  public serialize(): MetricSeriesFragmentPushMessage {
    this.serialized = true;
    return new MetricSeriesFragmentPushMessage([this]);
  }
}

export class MetricSeriesFragmentPushMessage {
  fragments: MetricSeriesFragment[];
  //labels: LabelSet;
  datamd5: string;
  data: Buffer;
  dataLengthBytes: number;
  dataLengthMiB: number;
  // to keep track of the raw data size
  payloadByteCount: bigint;
  serializationTimeSeconds: number;
  postHeaders: Record<string, string>;

  constructor(seriesFragments: MetricSeriesFragment[]) {
    this.fragments = seriesFragments;
    //this.labels = seriesFragment.labels;

    this.payloadByteCount = BigInt(0);
    const [data, datamd5, serializationTimeSeconds] = this.serialize();

    this.datamd5 = datamd5;
    this.data = data;
    this.serializationTimeSeconds = serializationTimeSeconds;
    this.dataLengthBytes = Buffer.byteLength(data);
    this.dataLengthMiB = Buffer.byteLength(data) / (1024.0 * 1024);

    // Set of HTTP headers that need to be set when POSTing a `serialize()`d
    // fragment to Cortex.
    this.postHeaders = {
      "Content-Type": "application/x-protobuf",
      "Content-Encoding": "snappy",
      "X-Prometheus-Remote-Write-Version": "0.1.0"
    };
  }

  public toString = (): string => {
    return `PushMessage(md5=${this.datamd5})`;
  };

  /**
   * Wrapper around `postToCortex` for simple retrying. The goal here is not to
   * silently try to heal transient problems as hard as possible. The goal is
   * to retry a couple of times with tight timing (no exp backoff), to keep
   * exhaustive logs about the progress, and then to fail relatively quickly
   * when things didn't work.
   *
   * @param cortexBaseUrl
   */
  public async postWithRetryOrError(
    cortexBaseUrl: string,
    maxRetries = 3,
    additionalHeaders?: Record<string, string>
  ) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      let response;
      try {
        response = await this.postToCortex(
          `${cortexBaseUrl}/api/v1/push`,
          additionalHeaders
        );
      } catch (e) {
        if (e instanceof got.RequestError) {
          // TCP conn errors/ timeout errors
          log.warning(
            `POST ${this}: attempt ${attempt} failed with ${e.message}`
          );
          await sleep(1.0);
          continue;
        } else {
          // programming errors
          throw e;
        }
      }

      if (response.statusCode === 200) {
        logHTTPResponseLight(response);
        // In the corresponding DummyStream object keep track of the fact that
        // this was successfully pushed out, important for e.g. read-based
        // validation after write.
        for (const fragment of this.fragments) {
          fragment.parent!.nFragmentsSuccessfullySentSinceLastValidate += 1;
        }
        return;
      }

      if (response.statusCode === 429) {
        log.info(
          `429 resp, sleep 2, body[:300]: ${response.body.slice(0, 300)}`
        );
        await sleep(3.0);
        continue;
      }

      logHTTPResponse(response);

      // Handle what's most likely permanent errors with the request
      if (response.statusCode.toString().startsWith("4")) {
        throw new Error("Bad HTTP request (see log above)");
      }

      // All other HTTP responses: treat as transient problems
      log.info("Treat as transient problem. Wait shortly, and retry");
      await sleep(3.0);
    }
    throw new Error(`Failed to POST ${this} after ${maxRetries} attempts`);
  }

  /**
   * Configure HTTP client and send POST HTTP request.
   *
   * @param url
   */
  public async postToCortex(
    url: string,
    additionalHeaders?: Record<string, string>
  ) {
    // log.info("url: %s", url);

    // "The HTTP request should contain the header X-Prometheus-Remote-Write-Version set to 0.1.0."
    let headers = {
      "Content-Type": "application/x-protobuf",
      "Content-Encoding": "snappy",
      "X-Prometheus-Remote-Write-Version": "0.1.0"
    };
    if (additionalHeaders !== undefined) {
      headers = {
        ...headers,
        ...additionalHeaders
      };
    }

    const response = await got.post(url, {
      body: this.data,
      throwHttpErrors: false,
      headers: headers,
      https: { rejectUnauthorized: false }, // disable TLS verification for now
      timeout: {
        // If a TCP connect() takes longer then ~5 seconds then most certainly there
        // is a networking issue, fail fast in that case.
        connect: 5000,
        request: 60000
      }
    });
    return response;
  }

  private serialize(): [Buffer, string, number] {
    /*
    Serialize the current set of samples (in the original order) into a
    protobuf message (a Prom "WriteRequest" containing a stream fragment
    containing the label set and the individual samples). Return the
    snappy-compressed protobuf message as Buffer. On the fly, compute a hash
    over the values of all samples.
    */

    const t0 = mtime();
    const dataHash = crypto.createHash("md5");

    // Allow for putting more than one time series into this push request.
    const seriesList = [];

    for (const fragment of this.fragments) {
      // Do a bit of book-keeping, so that this push request object after all
      // also has the byte count representing the _raw data_ readily available.
      this.payloadByteCount += fragment.payloadByteCount();

      // Construct the 'labels' part of this time series, where the combination
      // of key/value pairs actually identifies _this_ time series.
      const pblabels = [];
      for (const [key, val] of Object.entries(fragment.labels)) {
        pblabels.push(
          pbTypeLabel.create({
            name: key,
            value: val
          })
        );
      }

      // Create individual protobuf samples and build up a checksum from the
      // content of all samples, across time series (if there's more than one
      // fragment here).
      const pbsamples = [];
      for (const sample of fragment.getSamples()) {
        pbsamples.push(
          pbTypeSample.fromObject({
            timestamp: sample.time,
            value: sample.value
          })
        );
        // naive hash, maybe use toFixed. other resources:
        // https://stackoverflow.com/q/6009268/145400
        // https://github.com/alexgorbatchev/node-crc
        // https://nodejs.org/docs/v12.18.0/api/buffer.html#buffer_buf_writeint16le_value_offset
        // and the other write() funcs of buf: https://stackoverflow.com/a/8044900/145400
        dataHash.update(sample.value.toString());
      }

      // This "series" is a single time series.
      const series = pbTypeTimeseries.create({
        labels: pblabels,
        samples: pbsamples
      });

      seriesList.push(series);

      // mark fragment as serialized, for book-keeping.
      fragment.setSerialized();
    }
    const wr = pbTypeWriterequest.create({ timeseries: seriesList });

    const datamd5: string = dataHash.digest("hex");

    // This is the actual (and costly) serialization into the protobuf message
    // representing the write request.
    const wrbuffer = pbTypeWriterequest.encode(wr).finish();

    //log.info("jsonized write request:\n%s", JSON.stringify(wr, null, 2));

    // Type annotations do not seem to be quite ready. It would complain with
    // "Argument of type 'Uint8Array' is not assignable to parameter of type
    // 'string | Buffer'.
    // @ts-ignore: see above
    const wrBufferSnapped: Buffer = snappy.compressSync(wrbuffer);
    const serializationTimeSeconds = mtimeDiffSeconds(t0);
    return [wrBufferSnapped, datamd5, serializationTimeSeconds];
  }
}

//@ts-ignore input type any
export function formatFloatForComp(input) {
  // `input` is expected to be the reutrn value of mathjs functions
  // which is often `any`.
  return mathjs.format(input, {
    precision: 14,
    notation: "fixed"
  });
}
