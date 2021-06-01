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

import { parseRequiredEnv, parseEnv } from "./envParsers";

export const isDevEnvironment = parseEnv(
  "REMOTE_DEV",
  val => val === "development",
  false
);
export const isRemoteDevEnvironment = parseEnv("REMOTE_DEV", Boolean, false);
// hardcode the port so we can set the auth callbacks reliably
const PORT = 3001;

const DOMAIN = parseRequiredEnv(
  "DOMAIN",
  String,
  `must specify env var DOMAIN that represents the domain at which this server can be reached at (http://localhost:${PORT} for local dev)`
);

const UI_DOMAIN = isDevEnvironment ? `http://localhost:3000` : DOMAIN; // during dev, we use the webpack dev server as a separate process running on port 3000.

let COOKIE_SECRET = parseRequiredEnv(
  "COOKIE_SECRET",
  String,
  `must specify env var COOKIE_SECRET that represents the domain at which this server can be reached at (http://localhost:${PORT} for local dev)`
);

// These are required for now, since this is the only option we support.
// If we default to an Auth0 implemenation, then these can be optional
// and if provided, will override the default Auth0 auth method.
const AUTH0_CLIENT_ID = parseRequiredEnv("AUTH0_CLIENT_ID", String);
const AUTH0_DOMAIN = parseRequiredEnv("AUTH0_DOMAIN", String);

const GRAPHQL_ENDPOINT_HOST = parseRequiredEnv("GRAPHQL_ENDPOINT_HOST", String);
const GRAPHQL_ENDPOINT_PORT = parseRequiredEnv("GRAPHQL_ENDPOINT_PORT", Number);

const HASURA_GRAPHQL_ADMIN_SECRET = parseRequiredEnv(
  "HASURA_GRAPHQL_ADMIN_SECRET",
  String
);

const REDIS_HOST = isDevEnvironment
  ? parseEnv("REDIS_HOST", String, null)
  : parseRequiredEnv("REDIS_HOST", String);
const REDIS_PASSWORD = isDevEnvironment
  ? parseEnv("REDIS_PASSWORD", String, null)
  : parseRequiredEnv("REDIS_PASSWORD", String);

const envars = {
  PORT,
  REDIS_HOST,
  REDIS_PASSWORD,
  AUTH0_DOMAIN,
  AUTH0_CLIENT_ID,
  UI_DOMAIN,
  DOMAIN,
  COOKIE_SECRET,
  GRAPHQL_ENDPOINT_HOST,
  GRAPHQL_ENDPOINT_PORT,
  HASURA_GRAPHQL_ADMIN_SECRET
};

export default envars;
