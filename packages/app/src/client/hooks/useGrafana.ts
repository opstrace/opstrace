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

import { isFunction } from "ramda-adjunct";
import useSWR from "swr";
import axios from "axios";

import { grafanaUrl } from "client/utils/grafana";

// If 'path' is a function then the caller may be doing a conditional/dependent call through to useSWR so echo this.
// more info: https://swr.vercel.app/docs/conditional-fetching

export const useLoki = (
  path: string | (() => string),
  tenantName: string = "system"
) => {
  const makeUrl = (p: string) =>
    `${grafanaUrl({
      tenant: tenantName
    })}/grafana/api/datasources/proxy/2/loki/api/v1/${p}`;

  const url = isFunction(path) ? () => makeUrl(path()) : makeUrl(path);

  return useSWR(url, fetcher);
};

export const usePrometheus = (
  path: string | (() => string),
  tenantName: string = "system"
) => {
  const makeUrl = (p: string) =>
    `${grafanaUrl({
      tenant: tenantName
    })}/grafana/api/datasources/proxy/1/api/v1/${p}`;

  const url = isFunction(path) ? () => makeUrl(path()) : makeUrl(path);

  return useSWR(url, fetcher);
};

const fetcher = (url: string) =>
  axios({
    method: "get",
    url: url,
    withCredentials: true
  }).then(res => res.data);
