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

import { ZonedDateTime, DateTimeFormatter } from "@js-joda/core";
import yesno from "yesno";

import { log, hasUpperCase, die, sleep, ExitError } from "@opstrace/utils";
import { getValidatedGCPAuthOptionsFromFile } from "@opstrace/gcp";
import { CLUSTER_NAME_REGEX } from "@opstrace/config";

import * as cli from "./index";

/**
 * Validate command line-provided cluster name, with a focus on good error
 * messages.
 */
export function validateClusterNameOrDie(cn: string): void {
  if (cn.length > 13) {
    die(`cluster name must not be longer than 13 characters`);
  }

  if (cn.length < 2) {
    die(`cluster name must be at least 2 characters long`);
  }

  if (hasUpperCase(cn)) {
    die(`cluster name must not contain uppercase characters`);
  }

  // enforce cluster name restrictions for providing decent error messages.
  if (!CLUSTER_NAME_REGEX.test(cn)) {
    die(`cluster name does not match regular expression ${CLUSTER_NAME_REGEX}`);
  }
}

/**Sanity-check the contents of GOOGLE_APPLICATION_CREDENTIALS: can the file be
 * read? does it appear to have the right contents? Don't over-do the content
 * validation: source of truth are the GCP libraries which after all re-read
 * the environment variable an do their own file content parsing.
 *
 * Do not handle GOOGLE_APPLICATION_CREDENTIALS to not be set; handled
 * elsewhere.
 */
export function gcpValidateCredFileAndGetProjectIDOrError(): string {
  const fpath = process.env["GOOGLE_APPLICATION_CREDENTIALS"] || "";
  let opts;
  try {
    opts = getValidatedGCPAuthOptionsFromFile(fpath);
  } catch (err) {
    die(
      `the environment variable GOOGLE_APPLICATION_CREDENTIALS does not appear to point to a valid file ('${fpath}'): ${err.message}`
    );
  }
  return opts.projectId;
}

export async function promptForProceed(question?: string): Promise<void> {
  //@ts-ignore: declared but value never read
  function handleInvalid(options) {
    process.stdout.write(
      `\nAnswer ${options.yesValues.join(", ")} or ${options.noValues.join(
        ", "
      )}\n`
    );
  }

  if (question === undefined) {
    question = "Proceed?";
  }

  if (cli.CLIARGS.assumeYes !== true) {
    // Note(JP): when sending SIGINT during the prompt it does not trigger
    // the handler we install. There must be some other handler taking
    // over. This is not so cool, because we want to control shutdown. In our
    // SIGINT handler. Code:
    // https://github.com/tcql/node-yesno/blob/master/yesno.js
    const proceed = await yesno({
      question: question + " [y/N]",
      invalid: handleInvalid
    });

    log.debug("prompt result: %s", proceed);

    if (proceed !== true) {
      throw new ExitError(1, "user abort");
    }
  } else {
    log.info("do not prompt: --yes is set");
  }
}

/**
 * Handle error seen by the saga middleware, i.e. when `rootTask()` throws an
 * error. This might very well be an unhandled error from further down in the
 * saga hierarchy. Consider this situation to be fatal. Log any relevant error
 * detail to optimize for debuggability. Also see
 * https://github.com/redux-saga/redux-saga/issues/1698
 * https://redux-saga.js.org/docs/basics/ErrorHandling.html
 */
//@ts-ignore: Argument 'detail' should be typed with a non-any type
// eslint-disable-next-line
export function smErrorLastResort(e: Error, detail: any): void {
  // Cleanly shut down runtime when the inner call stack has thrown
  // ExitError. To that end, simply let it bubble up.
  // Note(JP): when throwing an error in here it's seemingly not passing
  // through `mainWrapper()` which is why ExitError needs to be handled here
  // just as in in `mainWrapper()`.
  if (e instanceof ExitError) {
    if (e.message !== "") {
      log.error(e.message);
    }
    runtimeShutdown(e.exitcode);

    // It's critical to return here so that the remaining logic is not executed
    // while the runtime is actually shutting down.
    return;
  }

  // e.stack contains error name and message
  log.error("error seen by saga middleware:\n%s", e.stack);
  // `detail` is actually expected to be `{ sagaStack: string }` -- use `any`
  // in type signature for easier integration -- the way redux-saga calls it is
  // actually `unknown`.

  if (detail && detail.sagaStack !== undefined) {
    log.error("saga stack: %s", detail.sagaStack);
  }
  die("exit.");
}

export async function runtimeShutdown(exitcode: number): Promise<never> {
  log.debug("shut down logger, then exit with code %s", exitcode);

  // https://github.com/winstonjs/winston#awaiting-logs-to-be-written-in-winston
  // Register callback function once the logging system is shut down.
  log.on("finish", function () {
    process.exit(exitcode);
  });

  // Initiate the logging system shutdown. This is important for "flushing
  // buffers" (for writing all log messages to files, for examples).
  log.end();

  // Trade-off: this should be plenty of buffer, but still tolerable from a
  // user's point of view (before they get impatient). The idea is that this
  // never hits in unless the CLI is in a pathological state.
  await sleep(2.0);

  process.stderr.write(
    "winston logging system shutdown timed out, exit anyway (code 2)"
  );
  process.exit(2);
}

export function timestampForFilenames(ts: ZonedDateTime): string {
  /*
  Return a timestamp string suitable for filenames (log files, in particular)

  Ref: https://js-joda.github.io/js-joda/manual/formatting.html

  DateTimeFormatter is seemingly not documented, but
  https://github.com/js-joda/js-joda/issues/181 shows how to make complex
  patterns, in particular how to escape arbitrary text within the pattern
  string.

  */
  if (ts.zone().toString() !== "Z") throw Error("code assumes Zulu time");
  return ts.format(DateTimeFormatter.ofPattern("yyyyMMdd'-'HHmmss'Z'"));
}
