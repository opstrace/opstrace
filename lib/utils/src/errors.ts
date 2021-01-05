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

export class ExitSuccess extends Error {
  constructor() {
    super();
    Error.captureStackTrace(this, ExitSuccess);
  }
}

export class ExitError extends Error {
  public exitcode: number;
  constructor(exitcode: number, msg: string) {
    super(msg);
    this.exitcode = exitcode;
    Error.captureStackTrace(this, ExitError);
  }
}

// `create` and `destroy` know the concept of high-level retries -- these are
// triggered by unforeseen errors, accompanied with a lot of debug information.
// This here is an error that an inner part can throw to trigger a high-evel
// retry w/o producing a lot of generic error output.
export class HighLevelRetry extends Error {
  constructor(msg: string) {
    super(msg);
    Error.captureStackTrace(this, HighLevelRetry);
  }
}
