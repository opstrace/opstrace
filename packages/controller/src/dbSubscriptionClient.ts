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

import { WebSocketLink } from "@apollo/client/link/ws";
import { onError } from "@apollo/client/link/error";
import { ApolloClient, InMemoryCache, from } from "@apollo/client";
import ws from "ws";

const endpoint = process.env.GRAPHQL_ENDPOINT;
const adminSecret = process.env.HASURA_GRAPHQL_ADMIN_SECRET ?? "";

if (endpoint && !adminSecret) {
  throw Error(
    "when specifying GRAPHQL_ENDPOINT, must also specify HASURA_GRAPHQL_ADMIN_SECRET"
  );
}

export type PromiseReturnType<T> = T extends PromiseLike<infer U> ? U : T;
export type ClientResponse<T extends (args?: any) => {}> = PromiseReturnType<
  ReturnType<T>
>;

export interface Subscription {
  unsubscribe(): void;
}

// TODO: improve this. Just a way to see all errors in the console for now
const subscriptionErrorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.map(({ message, locations, path }) =>
      console.warn(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      )
    );
  }
  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
  }
});

const subscriptionClient = endpoint
  ? () => {
    const wsLink = new WebSocketLink({
      uri: endpoint,
      options: {
        reconnect: true,
        connectionParams: {
          headers: {
            "x-hasura-admin-secret": adminSecret
          }
        }
      },
      // Node: websocket implementation must be provided explicitly
      webSocketImpl: ws
    });

    return new ApolloClient({
      cache: new InMemoryCache({
        resultCaching: false
      }),
      link: from([subscriptionErrorLink, wsLink])
    });
  }
  : () => null;

export default subscriptionClient();
