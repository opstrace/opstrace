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

export * from "./common";
export * from "./time";
export * from "./math";
export * from "./log";
export * from "./file";
export * from "./httpclient";
export * from "./naming";
export * from "./sagas";
export * from "./errors";
export * from "./diff";
export {
  sleep,
  mtime,
  mtimeDiffSeconds,
  mtimeDeadlineInSeconds
} from "./deadline";

import * as errors from "./errors";

/**
 * Shortcut for exiting the runtime with a non-zero exit code, and logging the
 * reason beforehand.
 */
export function die(errorMessage: string): never {
  throw new errors.ExitError(1, errorMessage);
}

export function hasUpperCase(s: string): boolean {
  return s.toLowerCase() != s;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export declare interface Dict<T = any> {
  [key: string]: T;
}
