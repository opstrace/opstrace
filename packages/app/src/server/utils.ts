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

import express, { Request } from "express";
import { IncomingMessage, ServerResponse, ClientRequest } from "http";
import { ServerError } from "./errors";

export const getHeader = (
  req: Request,
  header: string
): [string, Error | null] => {
  let headerValue = req.get(header);
  if (Array.isArray(headerValue)) {
    headerValue = headerValue[0];
  }
  if (!headerValue) {
    return ["", new Error(`missing header: ${header}`)];
  }
  return [headerValue, null];
};

export const getQueryParam = (
  req: Request,
  param: string
): [string, Error | null] => {
  let value = req.query[param];

  if (Array.isArray(value)) {
    value = value[0];
  }
  if (!value) {
    return ["", new Error(`missing query parameter: ${param}`)];
  }
  return [value.toString(), null];
};

export const handleError = (err: ServerError, res: express.Response): void => {
  res
    .status(err.statusCode || 500)
    .json({ ...err, message: err.message, stack: err.stack });
};

export function onProxyReq(
  proxyReq: ClientRequest,
  req: IncomingMessage,
  res: ServerResponse
) {
  // @ts-ignore
  if (!req.body || !Object.keys(req.body).length) {
    return;
  }

  const contentType = proxyReq.getHeader("Content-Type");
  const writeBody = (bodyData: string) => {
    proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
    proxyReq.write(bodyData);
  };

  if (contentType === "application/json") {
    // @ts-ignore
    writeBody(JSON.stringify(req.body));
  }

  if (contentType === "application/x-www-form-urlencoded") {
    // @ts-ignore
    writeBody(querystring.stringify(req.body));
  }
}
