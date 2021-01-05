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

import got, {
  Got,
  Response as GotResponse,
  RetryObject as GotRetryObject
} from "got";

import { log } from "./log";

// Generic/default HTTP timeout settings object for HTTP requests made with
// `got`. Note that every time an HTTP request is made we should review timeout
// and retry logic on a case-to-case basis -- certain HTTP responses are known
// to be generated quickly -- in that case, the response timeout should be far
// below 1 minute. Other HTTP responses are known to take a while to be
// generated (upper cap not known) in those cases, the response timeout should
// be set larger. The connect() timeout can /should in all cases be around or
// below 10 seconds.
const httpTimeoutSettings = {
  // If a TCP connect() takes longer then ~5 seconds then it's likely that
  // there is a networking issue, fail fast in that case. Unlikely, but also
  // possible: having a waiting position in the tcp accept queue of a server.
  connect: 10000,
  request: 30000
};

function retryfunc(ro: GotRetryObject): number {
  const req = ro.error.request;
  if (req === undefined) {
    log.debug(
      "got retryfunc() called w/o request context. attempt; %s, error: %s",
      ro.attemptCount,
      ro.error
    );
    return 1000;
  }

  // About got.RequestError "When a request fails. Contains a code property
  // with error class code, like ECONNREFUSED. All the errors below inherit
  // this one."

  let msg = "";
  msg += `${req.options.method} HTTP request to ${req.requestUrl} failed. `;
  msg += `Attempt: ${ro.attemptCount}. `;
  msg += `Error: ${ro.error.code}, ${ro.error.message}. `;

  const resp = ro.error.response;
  if (resp === undefined) {
    // No response information: transient / transport issue.
    log.info(msg);
    return 2000;
  }

  msg += `Response code: ${resp.statusCode}. `;
  msg += `Response body[:500]: ${getBodyPrefix(resp)}.`;

  log.info(msg);
  return 2000;
}

function getBodyPrefix(resp: GotResponse<unknown>): string {
  let bodyPrefix = "no body";

  if (resp.body !== undefined) {
    if (Buffer.isBuffer(resp.body)) {
      // If buffer: best-effort decode the buffer into text (this method does
      // _not_ not blow up upon unexpected byte sequences). `slice()` works
      // regardless of Buffer or string.
      bodyPrefix = resp.body.slice(0, 500).toString("utf-8");
    } else {
      // https://stackoverflow.com/a/9436948/145400
      assert(typeof resp.body === "string" || resp.body instanceof String);
      bodyPrefix = resp.body.slice(0, 500);
    }
  }

  return bodyPrefix;
}

// Create HTTP client object to be used by consumers of this module.
// See https://github.com/sindresorhus/got#gotextendoptions
export const httpcl: Got = got.extend({
  // this covers a range of transient issues:
  // ETIMEDOUT ECONNRESET EADDRINUSE ECONNREFUSED EPIPE ENOTFOUND ENETUNREACH EAI_AGAIN
  retry: {
    limit: 10,
    calculateDelay: retryfunc,
    // remove 429 for now, forhttps://github.com/opstrace/opstrace/issues/30
    statusCodes: [408, 413, 500, 502, 503, 504, 521, 522, 524],
    // do not retry for longer than 5 minutes
    maxRetryAfter: 5 * 60 * 1000
  },
  throwHttpErrors: true,
  timeout: httpTimeoutSettings
});

export function debugLogHTTPResponse(
  resp: GotResponse<unknown> | undefined
): void {
  if (resp === undefined) {
    log.debug("debugLogHTTPResponse: response not defined");
    return;
  }

  // about timings also see
  // https://gehrcke.de/2020/02/nodejs-http-clientrequest-finished-event-has-the-request-body-been-flushed-out/
  // Timings are exposed in milliseconds elapsed since the UNIX epoch, that is
  // where the /1000.0 comes from. Individual properties in the `.phases`
  // object may be `undefined` as far as the compiler is concerned and
  // potentially during runtime (I don't quite see how that can happen, but
  // anyway). In those cases use "nullish coalescing" to emit a negative
  // number.
  const ts = resp.timings;
  log.debug(`HTTP resp to ${resp.request.options.method}(${resp.requestUrl}):
    status: ${resp.statusCode}
    body[:500]: ${getBodyPrefix(resp)}
    headers: ${JSON.stringify(resp.headers)}
    totalTime: ${(ts.phases.total ?? -1000) / 1000.0} s
    dnsDone->TCPconnectDone: ${(ts.phases.tcp ?? -1000) / 1000.0} s
    connectDone->reqSent ${(ts.phases.request ?? -1000) / 1000.0} s
    reqSent->firstResponseByte: ${(ts.phases.firstByte ?? -1000) / 1000.0} s
    `);
}

export function debugLogHTTPResponseLight(resp: GotResponse): void {
  const t1 = (resp.timings.phases.total ?? -1000) / 1000.0;
  const t2 = (resp.timings.phases.firstByte ?? -1000) / 1000.0;
  log.debug(
    `resp to ${resp.request.options.method}(${resp.requestUrl}) -> ${
      resp.statusCode
    }. total time: ${t1.toFixed(2)} s. resp time: ${t2.toFixed(2)} s.`
  );
}
