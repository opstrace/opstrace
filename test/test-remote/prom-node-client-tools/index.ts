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

// import logfmt from "logfmt";
import protobuf from "protobufjs";
import snappy from "snappy";
import got from "got";
import Long from "long";

import * as mathjs from "mathjs";

import {
  log,
  mtimeDiffSeconds,
  mtime,
  sleep,
  logHTTPResponseLight,
  logHTTPResponse
} from "../testutils";

import { DummyTimeseries } from "./dummyseries";

export * from "./dummyseries";

const pbfRoot = protobuf.loadSync(
  `${__dirname}/resources/promproto_bundle.json`
);

const pbTypeWriterequest = pbfRoot.lookupType("prometheus.WriteRequest");
const pbTypeTimeseries = pbfRoot.lookupType("prometheus.TimeSeries");
const pbTypeSample = pbfRoot.lookupType("prometheus.Sample");
const pbTypeLabel = pbfRoot.lookupType("prometheus.Label");

export interface LabelSet {
  [key: string]: string;
}

export interface FragmentStats {
  timeMillisSinceEpochFirst: number;
  timeMillisSinceEpochLast: number;
  min: string;
  max: string;
  var: string;
  sampleCount: bigint; // to stress that this is never fractional
  //secondsBetweenSamples: bigint // to stress that this is never fractional
}

export class TimeseriesSample {
  public value: number;
  public time: Long; // int64 in prometheus protobuf, cf [ch1786], MillisSinceEpoch

  constructor(value: number, time: Long) {
    this.value = value;
    this.time = time;
  }
}

export class TimeseriesFragment {
  private samples: Array<TimeseriesSample>;
  private serialized: boolean;
  public labels: LabelSet;

  // Sequential number for locating fragmeng in stream. Set by caller.
  public index: number;
  public parent: DummyTimeseries | undefined;
  public stats: FragmentStats | undefined;

  constructor(
    labels: LabelSet,
    index = 0,
    dummyseries: DummyTimeseries | undefined = undefined
  ) {
    this.labels = labels;
    this.samples = new Array<TimeseriesSample>();
    this.index = index;
    this.parent = dummyseries;
    this.serialized = false;
  }

  public sampleCount() {
    return this.samples.length;
  }

  /*
  Return number of payload bytes. For a Prometheus metric sample, that's 64 bit
  (8 Bytes) per metric value, and 96 bit (12 Bytes) per metric timestamp.

  A protobuf timestamp is int64 + int32, i.e 12 bytes:
  https://github.com/protocolbuffers/protobuf/blob/4b770cabd7ff042283280bd76b6635650a04aa8a/src/google/protobuf/timestamp.proto#L136

  That is, 20 Bytes per sample.
  */
  public payloadByteCount(): bigint {
    if (this.stats !== undefined) {
      return this.stats.sampleCount * BigInt(20);
    }

    log.info("NUMBER OF SAMPLES IN FRAGMENT: %s", this.samples.length);
    return BigInt(this.samples.length) * BigInt(20);
  }

  public getSamples(): Array<TimeseriesSample> {
    // Return shallow copy so that mutation of the returned array does not have
    // side effects in here. However, if individual entries were to be mutated
    // this would take effect here, too.
    return [...this.samples];
  }

  // quickndirty compat with LogStreamFragment
  public getEntries(): Array<TimeseriesSample> {
    return this.getSamples();
  }

  public addSample(entry: TimeseriesSample): void {
    if (this.serialized) {
      throw new Error("cannot mutate TimeseriesFragment anymore");
    }
    this.samples.push(entry);
  }

  public indexString(length: number): string {
    // Return stringified and zero-padded index.
    const is: string = this.index.toString();
    return is.padStart(length, "0");
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
      //secondsBetweenSamples:
    };
    this.stats = stats;
    // log.info("fragmentStat right after generate: %s", stats);

    // drop main payload data
    // see https://stackoverflow.com/a/1232046/145400
    this.samples.length = 0;
    this.stats = stats;
  }

  public serialize(): TimeseriesFragmentPushMessage {
    this.serialized = true;
    return new TimeseriesFragmentPushMessage(this);
  }
}

export class TimeseriesFragmentPushMessage {
  fragment: TimeseriesFragment;
  labels: LabelSet;
  datamd5: string;
  data: Buffer;
  dataLengthBytes: number;
  dataLengthMiB: number;
  serializationTimeSeconds: number;
  postHeaders: Record<string, string>;

  constructor(seriesFragment: TimeseriesFragment) {
    this.fragment = seriesFragment;
    this.labels = seriesFragment.labels;

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
        this.fragment.parent!.nFragmentsSuccessfullySentSinceLastValidate += 1;
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

    const pblabels = [];
    for (const [key, val] of Object.entries(this.labels)) {
      pblabels.push(
        pbTypeLabel.create({
          name: key,
          value: val
        })
      );
    }

    // Create individual protobuf samples, and build up a checksum from the
    // textual content of all log messages.
    const pbsamples = [];
    for (const sample of this.fragment.getSamples()) {
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
    const datamd5: string = dataHash.digest("hex");

    const series = pbTypeTimeseries.create({
      labels: pblabels,
      samples: pbsamples
    });

    const wr = pbTypeWriterequest.create({ timeseries: [series] });

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
