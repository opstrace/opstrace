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

import env from "server/env";
import { NextFunction, Request, Response } from "express";

import { BUILD_INFO } from "@opstrace/utils";

export const AUTH0_CONFIG = {
  auth0_client_id: env.AUTH0_CLIENT_ID,
  auth0_domain: env.AUTH0_DOMAIN
};

export function pubUiCfgHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  res.status(200).json(AUTH0_CONFIG);
  return;
}

// require authentication?
export function buildInfoHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  res.status(200).json(BUILD_INFO);
  return;
}
