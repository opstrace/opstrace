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

import logfmt from "logfmt";
import protobuf from "protobufjs";
import snappy from "snappy";
import got from "got";

import {
  log,
  mtimeDiffSeconds,
  mtime,
  sleep,
  logHTTPResponseLight,
  logHTTPResponse
} from "../testutils";

import { DummyStream } from "./dummystream";

export * from "./dummystream";

// https://github.com/grafana/loki/blob/v1.2.0/pkg/logproto/logproto.proto
const logPbfRoot = protobuf.loadSync(
  `${__dirname}/resources/logproto_bundle.json`
);

const pbTypePushrequest = logPbfRoot.lookupType("logproto.PushRequest");
const pbTypeStream = logPbfRoot.lookupType("logproto.Stream");
const pbTypeEntry = logPbfRoot.lookupType("logproto.Entry");
const pbTypeTimestamp = logPbfRoot.lookupType("google.protobuf.Timestamp");

/*
Terminology is a little hard.

One log stream entry:
  - message (text)
  - timestamp

Log stream fragment:
  - N entries

Log stream:
  - continuous concept, N fragments (N unknown)
  - label set

*/

export interface LogStreamLabelset {
  [key: string]: string;
}

export interface LogStreamEntryTimestamp {
  seconds: number;
  nanos: number;
}

export class LogStreamEntry {
  public text: string;
  public time: LogStreamEntryTimestamp;

  constructor(text: string, time: LogStreamEntryTimestamp) {
    this.text = text;
    this.time = time;
  }
}

interface LogStreamFragmentStats {
  entryCount: bigint; // to stress that this is never fractional
  timeOfFirstEntry: string;
  timeOfLastEntry: string;
}

export class LogStreamFragment {
  /*
  A class that allows for building up a log stream fragment.

  A Loki log stream is defined by a set of labels, and a (generally continuous)
  stream of individual log entries in (generally) chronological order.
  A log stream fragment can be looked at as the set of log entries in a
  specific time window [T1, T2] from this generally continuous stream, where T1
  is defined by the oldest entry in the set, and T2 is the youngest entry in
  the set.

  Provides a method for adding individual log entries of type `LogStreamEntry`.

  Provides a method for serialization of the current set of entries (in the
  order as they have been added) into a byte sequence (snappy-compressed
  protobuf message) that can be used as the HTTP request body for POSTing the
  log stream fragment to Loki.
  */
  private entries: Array<LogStreamEntry>;
  //private payloadCharcount: number;
  private payloadBytecount: number;
  private serialized: boolean;

  public labels: LogStreamLabelset;

  // Sequential number for locating fragment in stream. Set by caller.
  public index: number;
  public parent: DummyStream | undefined;
  public stats: LogStreamFragmentStats | undefined;

  constructor(
    labels: LogStreamLabelset,
    index = 0,
    dummystream: DummyStream | undefined = undefined
  ) {
    this.labels = labels;
    this.entries = new Array<LogStreamEntry>();
    // Number of characters (text perspective) so far added to the fragment.
    // this.payloadCharcount = 0;
    // Number of bytes (after text encoding was applied, data perspective),
    // assuming utf-8 encoding.
    this.payloadBytecount = 0;
    this.index = index;
    this.parent = dummystream;
    this.serialized = false;
    this.stats = undefined;
  }

  public entryCount(): bigint {
    if (this.stats !== undefined) {
      return this.stats.entryCount;
    }
    return BigInt(this.entries.length);
  }

  /* Return the size of the payload data in this stream fragment.

  One way to do that would be to return a byte size
  */
  public payloadByteCount(): bigint {
    return BigInt(this.payloadBytecount);
  }

  public getEntries(): Array<LogStreamEntry> {
    // Return shallow copy so that mutation of the returned array does not have
    // side effects in here. However, if individual entries were to be mutated
    // this would take effect here, too.
    return [...this.entries];
  }

  public addEntry(entry: LogStreamEntry): void {
    this.entries.push(entry);
    // Keep track of the size of the payload that was added. This might be
    // expensive, but don't make any premature performance assupmtions here.
    // Measure what's bottlenecking. :)
    //this.payloadCharcount += entry.text.length;
    // A protobuf timestamp is int64 + int32, i.e 12 bytes:
    // https://github.com/protocolbuffers/protobuf/blob/4b770cabd7ff042283280bd76b6635650a04aa8a/src/google/protobuf/timestamp.proto#L136
    this.payloadBytecount += 12 + Buffer.from(entry.text, "utf8").length;
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

    const stats = {
      entryCount: BigInt(this.entries.length),
      timeOfFirstEntry: JSON.stringify(this.entries[0].time),
      timeOfLastEntry: JSON.stringify(this.entries.slice(-1)[0].time)
    };
    this.stats = stats;
    // log.info("fragmentStat right after generate: %s", stats);

    // drop main payload data
    // see https://stackoverflow.com/a/1232046/145400
    this.entries.length = 0;
    this.stats = stats;
  }

  public serialize(): LogStreamFragmentPushRequest {
    this.serialized = true;
    return new LogStreamFragmentPushRequest([this]);
  }
}

export class LogStreamFragmentPushRequest {
  fragments: LogStreamFragment[];
  //labels: LogStreamLabelset;
  textmd5: string;
  data: Buffer;
  dataLengthBytes: number;
  dataLengthMiB: number;
  // to keep track of the raw data size
  payloadByteCount: bigint;
  serializationTimeSeconds: number;
  postHeaders: Record<string, string>;

  constructor(logStreamFragment: LogStreamFragment[]) {
    this.fragments = logStreamFragment;
    //this.labels = logStreamFragment.labels;
    this.payloadByteCount = BigInt(0);

    const [
      data,
      textmd5,
      serializationTimeSeconds
    ] = this.toPushrequestBuffer();

    this.textmd5 = textmd5;
    this.data = data;
    this.serializationTimeSeconds = serializationTimeSeconds;
    this.dataLengthBytes = Buffer.byteLength(data);
    this.dataLengthMiB = Buffer.byteLength(data) / (1024.0 * 1024);

    // Set of HTTP headers that need to be set when POSTing a `serialize()`d
    // fragment to Loki.
    this.postHeaders = {
      "Content-Type": "application/x-protobuf",
      "Content-Encoding": "snappy"
    };
  }

  public toString = (): string => {
    return `PushRequest(md5=${this.textmd5})`;
  };

  /**
   * Wrapper around `postToLoki` for simple retrying. The goal here is not to
   * silently try to heal transient problems as hard as possible. The goal is
   * to retry a couple of times with tight timing (no exp backoff), to keep
   * exhaustive logs about the progress, and then to fail relatively quickly
   * when things didn't work.
   *
   * @param lokiBaseUrl
   */
  public async postWithRetryOrError(
    lokiBaseUrl: string,
    maxRetries = 3,
    additionalHeaders?: Record<string, string>
  ) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      let response;
      try {
        response = await this.postToLoki(
          `${lokiBaseUrl}/loki/api/v1/push`,
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

      if (response.statusCode === 204) {
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
      log.info("Treat as transient problem, retry");
    }
    throw new Error(`Failed to POST ${this} after ${maxRetries} attempts`);
  }

  /**
   * Configure HTTP client and send POST HTTP request.
   *
   * @param url
   */
  public async postToLoki(
    url: string,
    additionalHeaders?: Record<string, string>
  ) {
    let headers = {
      "Content-Type": "application/x-protobuf"
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

  private toPushrequestBuffer(): [Buffer, string, number] {
    /*
    Serialize the current set of entries (in the original order) into a
    protobuf message (a Loki "push request" containing a stream fragment
    containing the label set and the individual entries). Return the
    snappy-compressed protobuf message as Buffer. On the fly, compute a hash
    over the content (text message) of all log entries.
    */
    const t0 = mtime();
    const logTextHash = crypto.createHash("md5");

    // Allow for putting more than one time series into this push request.
    const streamsList = [];

    for (const fragment of this.fragments) {
      // Do a bit of book-keeping, so that this push request object after all
      // also has the byte count representing the _raw data_ readily available.
      this.payloadByteCount += fragment.payloadByteCount();

      const labelsEncodedAsString = logqlLabelString(fragment.labels);

      // Create individual protobuf entries, and build up a checksum from the
      // textual content of all log messages.
      const pbentries = [];
      for (const entry of fragment.getEntries()) {
        pbentries.push(
          pbTypeEntry.create({
            timestamp: pbTypeTimestamp.create(entry.time),
            // Note(JP): it is a bit unclear which text encoding is actually
            // applied here. The protobuf definition has type `string`:
            // https://github.com/grafana/loki/blob/14b2c093c19e17103e564b0aa6af0cf16ff0e5bc/pkg/logproto/types.go#L20
            // the protobufjs library has to apply _some_ text encoding, and it's
            // likely to be UTF-8.
            line: entry.text
          })
        );
        // Update log text hash with the UTF-8-encoded version of the text.
        // From docs: "If encoding is not provided, and the data is a string,
        // an encoding of 'utf8' is enforced"
        logTextHash.update(entry.text);
      }

      const stream = pbTypeStream.create({
        labels: labelsEncodedAsString,
        entries: pbentries
      });
      streamsList.push(stream);
    }

    const pr = pbTypePushrequest.create({ streams: streamsList });

    const logtextmd5: string = logTextHash.digest("hex");
    // This is the actual (and costly) serialization into the protobuf message
    // representing the push request.
    const prbuffer = pbTypePushrequest.encode(pr).finish();

    // Type annotations do not seem to be quite ready. It would complain with
    // "Argument of type 'Uint8Array' is not assignable to parameter of type
    // 'string | Buffer'.
    // @ts-ignore: see above
    const prBufferSnapped: Buffer = snappy.compressSync(prbuffer);
    const serializationTimeSeconds = mtimeDiffSeconds(t0);
    return [prBufferSnapped, logtextmd5, serializationTimeSeconds];
  }
}

export function logqlKvPairTextToObj(lql: string) {
  /*
    Loki returns something like this (string) as value for the `labels` key:
        {filename=\"/var/log/myproject.log\", job=\"varlogs\", level=\"info\"}
    This is not JSON, this is wtf. Documented as:
        "<LogQL label key-value pairs>"
    Deserialize by stripping the leading and trailingcurly brackets and by
    removing the commas, then parse as logfmt.
    */
  const intermediate = logfmt.parse(lql.slice(1, -1).replace(/,/g, ""));

  // The object `intermediate` might have values of two types: either strings
  // or booleans see https://www.npmjs.com/package/logfmt#logfmtparsestring
  // Convert booleans to strings here jut keep things simple, predictable.
  const labels: LogStreamLabelset = Object.fromEntries(
    Object.entries(intermediate).map(([k, v]) => [k, v.toString()])
  );
  return labels;
}

export function logqlLabelString(labels: Record<string, string>) {
  /*
    Turn flat key/value pair object into Loki label string
      <LogQL label key-value pairs>
    That is approximately the inverse of the function `logqlKvPairTextToObj()`
    above.
    Example input:
      labels = {a:2, b:4}
    Example output:
      '{a="2", b="4"}'
    */
  const core = Object.entries(labels)
    .map(([k, v]) => `${k}="${v}"`)
    .join(", ");
  return `{${core}}`;
}
