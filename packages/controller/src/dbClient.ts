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
import { GraphQLClient } from "graphql-request";
import { getSdk } from "./dbSDK";

// Make this optional, so that running the controller locally during dev
// doesn't require a connection to the db.
const endpoint = process.env.GRAPHQL_ENDPOINT;
const adminSecret = process.env.HASURA_GRAPHQL_ADMIN_SECRET ?? "";

if (endpoint && !adminSecret) {
  throw Error(
    "when specifying GRAPHQL_ENDPOINT, must also specify HASURA_GRAPHQL_ADMIN_SECRET"
  );
}

const client = endpoint
  ? new GraphQLClient(endpoint, {
      headers: {
        "x-hasura-admin-secret": adminSecret
      }
    })
  : null;

export type PromiseReturnType<T> = T extends PromiseLike<infer U> ? U : T;
export type ClientResponse<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends (args?: any) => Record<string, any>
> = PromiseReturnType<ReturnType<T>>;

export default client ? getSdk(client) : null;
