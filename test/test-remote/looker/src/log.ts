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

import { format, createLogger, transports, config, Logger } from "winston";

const logFormat = format.printf(
  ({ level, message, timestamp, stack }) =>
    `${timestamp} ${level}: ${message}${stack ? ": " + stack : ""}`
);

// Note that other modules importing `log` from here will see see 'live
// updates' to this variable: "The static import statement is used to import
// read only live bindings". Consuming modules are supposed to import `log` and
// then use it via `log.info('msg')` etc.
export let log: Logger;

export function setLogger(logger: Logger): void {
  if (log !== undefined) {
    log.debug(
      "logger already defined. current logger: %s, new logger: %s",
      log,
      logger
    );
  }
  log = logger;
}

export interface CliLogOptions {
  filePath?: string;
  fileLevel?: string;
  stderrLevel: string;
}

export function buildLogger(opts: CliLogOptions): Logger {
  // Try to import the `TransportStream` type. Use that instead of `any`.
  const ts: Array<
    transports.ConsoleTransportInstance | transports.FileTransportInstance
  > = [
    // Emit to stderr (stdout is default). Also see opstrace-prelaunch/issues/998.
    new transports.Console({
      stderrLevels: Object.keys(config.syslog.levels),
      level: opts.stderrLevel,
      format: format.combine(
        // removing format.error because it throws "function does not exist" and
        // adding the stack formatting to the logFormat above instead.
        format.splat(),
        format.timestamp(),
        format.colorize(),
        logFormat
      )
    })
  ];

  if (
    [opts.filePath, opts.fileLevel].filter(v => v !== undefined).length == 1
  ) {
    throw Error("logfileLevel requires logfilePath and vice versa");
  }

  if (opts.fileLevel !== undefined) {
    ts.push(
      new transports.File({
        filename: opts.filePath,
        level: opts.fileLevel,
        format: format.combine(
          // removing format.error because it throws "function does not exist" and
          // adding the stack formatting to the logFormat above instead.
          format.splat(),
          format.timestamp(),
          logFormat
        )
      })
    );
  }

  // console.log(JSON.stringify(ts, null, 2));

  return createLogger({
    // Use syslog levels (`warning' etc.),
    // see https://github.com/winstonjs/winston-syslog#log-levels
    levels: config.syslog.levels,
    transports: ts
  });
}

// file transport options
//
// filename?: string;
// dirname?: string;
// options?: object;
// maxsize?: number;
// stream?: NodeJS.WritableStream;
// rotationFormat?: Function;
// zippedArchive?: boolean;
// maxFiles?: number;
// eol?: string;
// tailable?: boolean;

export function debugLogErrorDetail(err: Error): void {
  if (err === undefined) {
    log.debug("debugLogErrorDetail: `err` obj is undefined. Sadness.");
    return;
  }

  let s: string;
  s = `err.name: ${err.name}`;
  // Also log `code`, a property on NodeJS errors:
  // https://nodejs.org/api/errors.html#errors_class_error
  //@ts-ignore: code does not exist on type Error
  s += `err.code: ${err.code}`;
  s += `err.message: ${err.message}`;
  s += `err.stack: ${err.stack}`;
  log.debug("err detail: %s", s);
  // log JSON-serialized `err` object because it's not always an Error
  // object, see opstrace-prelaunch/issues/1290
  // (optimize for debuggability). Note that this might not always work
  // e.g. as of `TypeError: Converting circular structure to JSON`
  try {
    log.debug("JSON representation of err: %s", JSON.stringify(err, null, 2));
  } catch (e) {
    log.debug("could not json-serialize error: %s", e);
  }
}

// Set default logger So that `log` in this module can actually be used via
// e.g. `log.info()`, otherwise importing and using `log` from this module w/o
// calling setLogger() results in difficult-to-debug errors like `Cannot read
// property 'info' of undefined`.
setLogger(buildLogger({ stderrLevel: "debug" }));

// If two of these are used in the same program then these `log` objects
// are _different_ and compete for the same underlying stream, which may
// result in interleaved log messages I believe.
