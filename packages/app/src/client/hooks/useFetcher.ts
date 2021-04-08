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

import useSWR from "swr";

import { fetcher } from "state/clients/graphqlClient";

import useDeepMemo from "client/hooks/useDeepMemo";

// NTW: SWR does shallow comparisons of the token passed to determine cache hits/misses
// passing in structured graphql variables means we never get a cache hit, so have
// wrapped the useSWR call with useDeepMemo to ensure that the same array is passed in
// for the same variables

const useFetcher = (query: string, variables?: {}) => {
  const token = useDeepMemo(() => [query, variables], [query, variables]);

  return useSWR(token, fetcher);
};

export default useFetcher;
