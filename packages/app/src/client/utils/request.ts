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

import axios from "axios";
import * as rax from "retry-axios";

const request = axios.create({
  // For config options see https://github.com/axios/axios#request-config
  timeout: 10000
});

request.defaults.raxConfig = {
  // For requests that return a transient error (5xx).
  retry: 3,

  // For transient errors on transport level (DNS resolution, TCP connect()
  // timeout, recv() timeout)
  noResponseRetries: 3,

  // Constant delay between attempts.
  backoffType: "static",
  // Delay between attempts in ms
  retryDelay: 4000,

  // HTTP methods to automatically retry
  httpMethodsToRetry: ["GET", "DELETE", "PUT"],

  // The response status codes to retry. 2 tuple array: list of ranges.
  statusCodesToRetry: [
    [100, 199],
    [429, 429],
    [500, 599]
  ],

  onRetryAttempt: function (err) {
    const cfg = rax.getConfig(err);
    //@ts-ignore cfg possibly undefined
    console.log(`Retry attempt #${cfg.currentRetryAttempt} -- error: ${err}`);
  }
};

rax.attach(request);

export default request;
