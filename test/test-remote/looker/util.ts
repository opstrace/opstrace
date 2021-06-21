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

import { Response as GotResponse } from "got";

import { log } from "./log";

let COUNTER_HTTP_RESP_LOG_THROTTLE = 0;
//import { COUNTER_HTTP_RESP_LOG_THROTTLE } from "./index";

export function rndFloatFromInterval(min: number, max: number) {
  // half-closed: [min, max)
  return Math.random() * (max - min) + min;
}

// A helper to for throttling log messages, towards keeping the number of
// actual log messages emitted on the order of 10^1.
export function logEveryNcalc(total: number) {
  // Assume `number` is a positive integer.

  if (total <= 10) {
    return 1;
  }

  // Get order of magnitude of the `total`. For example,
  // this is 5 (as in O(10^5)) when the input `total=400000`.
  const o = Math.floor(Math.log10(total));

  // Return one order of magnitude less.
  return Math.pow(10, o - 1);
}

/**
 * Split array into chunks, last element in return value may have less then
 * desired chunk size.
 *
 * Do not mutate original array.
 *
 * props to
 * https://stackoverflow.com/questions/8495687/split-array-into-chunks#comment114499622_24782004
 * chunkArray([1,2,3,4,5,6,7,8], 3);
 * Output: [ [1,2,3] , [4,5,6] ,[7,8] ]
 */
export function chunkify<T>(a: T[], chunkSize: number): T[][] {
  const R = [];
  for (let i = 0, len = a.length; i < len; i += chunkSize)
    R.push(a.slice(i, i + chunkSize));
  return R;
}

// Choose N elements from array. No repetition. Uniform distribution.
// "A (partial) fisher-yates shuffle", non-destructive for the original array,
// according to the author "Bergi". Kudos to
// https://stackoverflow.com/a/19270021/145400 -- adjusted to TS from there. On
// the other hand: I would so much love to rely on a well-established stdlib
// method instead of an SO answer.
export function randomSampleFromArray(a: Array<any>, n: number) {
  const result = new Array(n);
  let len = a.length;
  const taken = new Array(len);
  if (n > len)
    throw new Error(
      "randomSampleFromArray(): more elements taken than available"
    );
  while (n--) {
    const x = Math.floor(Math.random() * len);
    result[n] = a[x in taken ? taken[x] : x];
    taken[x] = --len in taken ? taken[len] : len;
  }
  return result;
}

// Try to do a better job for a small selection (e.g. 1) of a larger array
// (e.g. 10^6) -- kudos to https://stackoverflow.com/a/61078260/145400
// modified: don't mutate original array
// function randomSampleFromArray2(pool: Array<any>, k: number) {
//   const n = pool.length;

//   const destructive = false;

//   if (k < 0 || k > n)
//     throw new RangeError("Sample larger than population or is negative");

//   if (
//     destructive ||
//     n <=
//       (k <= 5 ? 21 : 21 + Math.pow(4, Math.ceil(Math.log(k * 3) / Math.log(4))))
//   ) {
//     if (!destructive) pool = Array.prototype.slice.call(pool);
//     for (let i = 0; i < k; i++) {
//       // invariant: non-selected at [i,n)
//       const j = (i + Math.random() * (n - i)) | 0;
//       const x = pool[i];
//       pool[i] = pool[j];
//       pool[j] = x;
//     }
//     pool.length = k; // truncate
//     return pool;
//   } else {
//     const selected = new Set();
//     while (selected.add((Math.random() * n) | 0).size < k) {}
//     return Array.prototype.map.call(selected, i => pool[i]);
//   }
// }

export function logHTTPResponseLight(
  resp: GotResponse,
  requestDetail?: string
) {
  let reqDetailForLog = "";
  if (requestDetail !== undefined) {
    reqDetailForLog = requestDetail;
  }

  const t1 = (resp.timings.phases.total ?? -1000) / 1000.0;
  const t2 = (resp.timings.phases.firstByte ?? -1000) / 1000.0;
  const msg = `resp to ${resp.request.options.method} ${reqDetailForLog} -> ${
    resp.statusCode
  }. total time: ${t1.toFixed(2)} s. resp time: ${t2.toFixed(2)} `;

  // Info-log only every Nth response -- maybe expose N through CLI.
  const logEveryN = 400;
  if (COUNTER_HTTP_RESP_LOG_THROTTLE % 400 == 0) {
    log.info(`${msg} (${logEveryN - 1} msgs like this hidden)`);
  } else {
    log.debug(msg);
  }

  COUNTER_HTTP_RESP_LOG_THROTTLE++;
}

export function logHTTPResponse(
  resp: GotResponse<string> | GotResponse<Buffer>,
  requestDetail?: string
) {
  let reqDetailForLog = "";
  if (requestDetail !== undefined) {
    reqDetailForLog = ` (${requestDetail})`;
  }
  // `slice()` works regardless of Buffer or string.
  let bodyPrefix = resp.body.slice(0, 500);
  // If buffer: best-effort decode the buffer into text (this method does _not_
  // not blow up upon unexpected byte sequences).
  if (Buffer.isBuffer(bodyPrefix)) bodyPrefix = bodyPrefix.toString("utf-8");

  const ts = resp.timings;

  log.info(`HTTP resp to ${resp.request.options.method}(${
    resp.requestUrl
  }${reqDetailForLog}):
    status: ${resp.statusCode}
    body[:500]: ${bodyPrefix}
    headers: ${JSON.stringify(resp.headers)}
    totalTime: ${(ts.phases.total ?? -1000) / 1000.0} s
    dnsDone->TCPconnectDone: ${(ts.phases.tcp ?? -1000) / 1000.0} s
    connectDone->reqSent ${(ts.phases.request ?? -1000) / 1000.0} s
    reqSent->firstResponseByte: ${(ts.phases.firstByte ?? -1000) / 1000.0} s
    `);
}
