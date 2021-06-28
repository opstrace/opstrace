/**
 * Copyright 2019-2021 Opstrace, Inc.
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

// Note(JP): this module implements tooling for doing deadline handling and
// duration measurement based on a monotonic time source.

export function sleep(seconds: number): Promise<unknown> {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000.0));
}

// https://nodejs.org/api/process.html#process_process_hrtime_time
// https://stackoverflow.com/a/58945714/145400
export function mtime(): bigint {
  // The clock source is an in-process monotonic time source with high temporal
  // resolution. The absolute value is meaningless. The difference between
  // consecutively obtained values (type BigInt) is the wall time passed in
  // nanoseconds.
  return process.hrtime.bigint();
}

export function mtimeDiffSeconds(ref: bigint): number {
  // number of seconds passed since reference point in time (in the past).
  // `ref` must be a value previously obtained from `mtime()`. Number()
  // converts a BigInt to a regular Number type, allowing for translating from
  // nanoseconds to seconds with a simple division, retaining sub-second
  // resolution. This assumes that the measured time duration does not grow
  // beyond 104 days.
  return Number(process.hrtime.bigint() - ref) / 10 ** 9;
}

export function mtimeDeadlineInSeconds(seconds: number): bigint {
  return process.hrtime.bigint() + BigInt(seconds * 10 ** 9);
}

export function mtimeDeadlineTimeLeftSeconds(deadline: bigint): number {
  // given a deadline as returned by `mtimeDeadlineInSeconds` calculate
  // the time left in seconds from _now_ until that deadline is hit.
  return Number(deadline - process.hrtime.bigint()) / 10 ** 9;
}
