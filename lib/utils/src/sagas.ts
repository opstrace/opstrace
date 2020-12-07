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

/**
 * Utilities for redux-saga-based task management.
 */

import { call, delay } from "redux-saga/effects";

import { log } from "./log";
import { SECOND } from "./time";
import { ExitError } from "./errors";

export interface RetryUponAnyErrorParams {
  task: any;
  maxAttempts: number;
  doNotLogDetailForTheseErrors: any;
  actionName: string;
  delaySeconds: number;
}

/**
 * Pragmatic retry loop with a specific kind of error handling, see below.
 * Initially moved here because this was shared code between CLI-initiated
 * cluster creation and cluster destruction.
 */
export function* retryUponAnyError({
  task,
  maxAttempts,
  doNotLogDetailForTheseErrors,
  actionName,
  delaySeconds
}: RetryUponAnyErrorParams) {
  let attempt = 0;
  while (true) {
    attempt++;
    if (attempt > 1) {
      if (attempt > maxAttempts) {
        throw new ExitError(
          1,
          `${attempt - 1} attempt(s) failed. Stop retrying. Exit.`
        );
      }
      log.info("start attempt %s in %s s", attempt, delaySeconds);
      yield delay(delaySeconds * SECOND);
    }
    try {
      yield call(task);
      log.debug("task `%s` succeeded (attempt %s)", actionName, attempt);
      return;
    } catch (err) {
      // Cleanly shut down runtime when the inner call stack has thrown
      // ExitError (that's precisely the signal to _not_ retry). To that end,
      // simply let it bubble up.
      if (err instanceof ExitError) {
        throw err;
      }

      // We could specify a set of retryable errors, i.e. retry upon specific
      // errors and re-raise other errors. This would optimize for revealing
      // programming errors, especially in CI. The alternative, retrying upon
      // all errors, is towards "best effort" and therefore robustness, but
      // might hide programming errors. Choose the "best effort" method, i.e.
      // over-generalize this error handler and log all error detail (including
      // stack trace) by default. As a middle ground, do not log the stack
      // trace for expected errors.
      let logdetail = true;
      for (const etype of doNotLogDetailForTheseErrors) {
        if (err instanceof etype) {
          logdetail = false;
          break;
        }
      }
      if (logdetail) {
        log.error(
          "error during %s (attempt %s):\n%s",
          actionName,
          attempt,
          err
        );

        // situation w/o stack trace, example:
        //  2020-12-07T11:46:53.770Z error: error during cluster creation (attempt 3):
        //  AssertionError [ERR_ASSERTION]: false == true
        //  2020-12-07T11:46:53.771Z error: JSON representation of err: {
        //    "generatedMessage": true,
        //    "code": "ERR_ASSERTION",
        //    "actual": false,
        //    "expected": true,
        //    "operator": "=="
        //  }
        // be sure to include stack object explicitly in debug log:
        // https://nodejs.org/api/errors.html#errors_error_stack
        log.debug("`err?.stack`: %s", err?.stack);
        // log JSON-serialized `err` object because it's not always an Error
        // object, see opstrace-prelaunch/issues/1290
        // (optimize for debuggability). Note that this might not always work
        // e.g. as of `TypeError: Converting circular structure to JSON`
        try {
          log.error(
            "JSON representation of err: %s",
            JSON.stringify(err, null, 2)
          );
        } catch (e) {
          log.debug("could not json-serialize error: %s", e);
        }
      }
    }
  }
}
