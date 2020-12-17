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

import { EventEmitter } from "events";

import { log } from "./log";

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

export function timeoutTerminator(timeoutSeconds: number): EventEmitter {
  // Exit NodeJS process in with non-zero exit status once the deadline is hit.

  // check current time against deadline every so often.
  const loopIntervalSeconds = 1.0;

  // report (log) current timeout status at least every so often.
  const maxReportDelaySeconds = 60 * 3;

  const timeoutCanceller = new EventEmitter();
  let cancelled = false;

  // Create a promise with an async executor and do not return the promise.
  // Allow "cancellation" from the outside: by design, the only way to resolve
  // ("cancel") that promise from the outside is with a specific event emitter.
  // The promise will never be explicitly rejected. This is pretty similar to a
  // technique ususally called "cancellation token", but I like the event
  // handler more. Refs:
  // https://blog.bloomca.me/2017/12/04/how-to-cancel-your-promise.html
  // https://github.com/nodejs/promise-use-cases/issues/10
  // https://stackoverflow.com/a/30235261/145400

  // Usage of an async promise executor seems to be disputed. Below's approach
  // is rather well thought-through and seems to work, because `await sleep()`
  // is easy to reason about in terms of errors. We should probably change the
  // approach, though, seems like ESLint would complain if we were to use it.
  // Resources: https://stackoverflow.com/a/43050114/145400
  // https://eslint.org/docs/rules/no-async-promise-executor
  // https://github.com/eslint/eslint/issues/11982
  // https://github.com/standard/standard/issues/1239
  // eslint-disable-next-line no-async-promise-executor,@typescript-eslint/no-unused-vars
  new Promise(async function (resolvefunc, _) {
    timeoutCanceller.once("cancel", () => {
      log.debug("timeoutTerminator: cancel event received");
      cancelled = true;
    });

    const deadlineTerminate = mtimeDeadlineInSeconds(timeoutSeconds);
    // report every maxReportDelaySeconds or every 5th interval of timeout,
    // whatever is smaller
    const reportIntervalSeconds = Math.min(
      maxReportDelaySeconds,
      timeoutSeconds / 5.0
    );

    let deadlineReport = mtimeDeadlineInSeconds(reportIntervalSeconds);

    function report() {
      const s = mtimeDeadlineTimeLeftSeconds(deadlineTerminate);
      log.info(
        "timeoutTerminator: %s s (%s min) remaining",
        s.toFixed(1),
        (s / 60.0).toFixed(1)
      );
      // Update deadline for the next report.
      deadlineReport = mtimeDeadlineInSeconds(reportIntervalSeconds);
    }

    // initial report, then every `reportIntervalSeconds`.
    report();

    while (!cancelled) {
      if (mtime() > deadlineTerminate) {
        log.error("timeoutTerminator: deadline hit. terminate process.");
        process.exit(1);
      }

      if (mtime() > deadlineReport) {
        report();
      }

      await sleep(loopIntervalSeconds);
    }

    // End of loop after having been cancelled. Explicitly resolve the promise
    // although nobody waits for its resolution (resource cleanup).
    log.info("timeoutTerminator: cancelled");
    //@ts-ignore missing one argument (was tested w/o argument, should work)
    resolvefunc();
  });

  return timeoutCanceller;
}
