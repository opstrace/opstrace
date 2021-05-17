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

import useSWR, { mutate, SWRResponse } from "swr";

import useDeepMemo from "client/hooks/useDeepMemo";

import {
  endpoint,
  headers as authHeader
} from "state/clients/graphqlClient/subscriptionClient";

const headers = { "Content-Type": "application/json", ...authHeader };

// const useHasura: (query: string, variables?: {} | undefined) => SWRResponse<any, any>
const useHasuraSubscription = (
  query: string,
  variables: {} = {}
): SWRResponse<any, any> => {
  const token = useDeepMemo(() => [query, variables], [query, variables]);
  return useSWR(token, fetcher(token, query, variables));
};

const fetcher = (token: any, query: string, variables: {} = {}) => {
  let latestData = null;

  const subscribe = async (query: string, variables: {} = {}) => {
    if (typeof window !== "undefined") {
      const ws = new WebSocket(endpoint, "graphql-ws");
      const init_msg = {
        type: "connection_init",
        payload: { headers }
      };
      ws.onopen = function (event) {
        ws.send(JSON.stringify(init_msg));
        const msg = {
          id: "1",
          type: "start",
          payload: {
            variables: variables,
            extensions: {},
            operationName: null,
            query: query
          }
        };
        ws.send(JSON.stringify(msg));
      };
      ws.onmessage = function (data) {
        const finalData = JSON.parse(data.data);
        if (finalData.type === "data") {
          latestData = finalData.payload.data;
          mutate(token, latestData, false);
          return latestData;
        }
      };
    }
  };

  return () => subscribe(query, variables);
};

export default useHasuraSubscription;
