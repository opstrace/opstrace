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

type OriginalError = null | { name: string; message: string; stack?: string };

export class ServerError extends Error {
  public originalError: OriginalError;
  public errorType: string = "OpstraceServerError";
  static isInstance(err: any): err is ServerError {
    return err.errorType === "OpstraceServerError";
  }
  constructor(public statusCode: number, public message: string, err?: Error) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.message = message;
    this.originalError = err
      ? { name: err.name, message: err.message, stack: err.stack }
      : null;
    // we don't need a stacktrace for errors we expect.
    // this will help us log expected vs unexpected errors by
    // checking the presence of error.stack.
    this.stack = undefined;
  }
}

export class GeneralServerError extends ServerError {
  static isInstance(err: any): err is GeneralServerError {
    return err.name === "GeneralServerError";
  }
  constructor(public statusCode: number, public message: string, err?: Error) {
    super(statusCode, message, err);
    this.name = "GeneralServerError";
  }
}

export class UnexpectedServerError extends ServerError {
  public stack: string;
  static isInstance(err: any): err is UnexpectedServerError {
    return err.name === "UnexpectedServerError";
  }
  constructor(err: Error) {
    super(500, err.message, err);
    this.stack = err.stack || "";
    this.name = "UnexpectedServerError";
  }
}
