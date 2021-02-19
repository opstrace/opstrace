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

export const isDevEnvironment = process.env.NODE_ENV === "development";
// hardcode the port so we can set the auth callbacks reliably
const PORT = 3001;

let DOMAIN = process.env.DOMAIN;
if (!DOMAIN) {
  throw Error(
    `must specify env var DOMAIN that represents the domain at which this server can be reached at (http://localhost:${PORT} for local dev)`
  );
}

const UI_DOMAIN = isDevEnvironment ? `http://localhost:3000` : DOMAIN; // during dev, we use the webpack dev server as a separate process running on port 3000.

let COOKIE_SECRET = process.env.COOKIE_SECRET;
if (!COOKIE_SECRET) {
  throw Error(
    `must specify env var COOKIE_SECRET that represents the domain at which this server can be reached at (http://localhost:${PORT} for local dev)`
  );
}

// These are required for now, since this is the only option we support.
// If we default to an Auth0 implemenation, then these can be optional
// and if provided, will override the default Auth0 auth method.
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
if (!AUTH0_CLIENT_ID || !AUTH0_DOMAIN) {
  throw Error("must provide env vars: AUTH0_CLIENT_ID & AUTH0_DOMAIN");
}

const GRAPHQL_ENDPOINT_PORT = process.env.GRAPHQL_ENDPOINT_PORT;
const GRAPHQL_ENDPOINT_HOST = process.env.GRAPHQL_ENDPOINT_HOST;
if (!GRAPHQL_ENDPOINT_HOST || !GRAPHQL_ENDPOINT_PORT) {
  throw Error(
    "must provide env vars: GRAPHQL_ENDPOINT_HOST & GRAPHQL_ENDPOINT_PORT"
  );
}

const HASURA_GRAPHQL_ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
if (!HASURA_GRAPHQL_ADMIN_SECRET) {
  throw Error("must provide env vars: HASURA_GRAPHQL_ADMIN_SECRET");
}

const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
if (!REDIS_PASSWORD && !isDevEnvironment) {
  throw Error("must provide env vars: REDIS_PASSWORD");
}

const REDIS_HOST = process.env.REDIS_HOST;
if (!REDIS_HOST && !isDevEnvironment) {
  throw Error("must provide env vars: REDIS_HOST");
}

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
