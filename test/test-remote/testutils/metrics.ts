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

import {
  log,
  queryJSONAPI,
  waitForQueryResult
} from "./index";

import { PortForward } from "./portforward";

// Queries Cortex metrics data and waits for a non-empty result.
export async function waitForCortexMetricResult(
  cortexBaseUrl: string,
  queryParams: Record<string, string>,
  // Query endpoint under /api/v1 to hit, e.g. "query" for latest value or "query_range" for time range
  queryUrlSuffix: string,
  // What's our latency goal here? Upper pipeline latency limit? As of writing
  // this code I have seen this latency to vary between about 2 seconds and 12
  // seconds.
  maxWaitSeconds = 30,
  logQueryResponse = false
) {
  const url = `${cortexBaseUrl}/api/v1/${queryUrlSuffix}`;

  log.info(
    "Cortex query parameter (object):\n%s",
    JSON.stringify(queryParams, Object.keys(queryParams).sort(), 2)
  );
  const qparms = new URLSearchParams(queryParams);
  log.info("Cortex query parameters (query string):\n%s", qparms);

  return waitForQueryResult(
    () => queryJSONAPI(url, qparms),
    (data) => {
      // Example data:
      // - query: https://prometheus.io/docs/prometheus/latest/querying/api/#instant-queries
      // - query_range: https://prometheus.io/docs/prometheus/latest/querying/api/#range-queries
      // Metrics data has results nested here, wait for non-empty result:
      const resultArray = data["data"]["result"];
      return (resultArray.length > 0) ? resultArray : null;
    },
    maxWaitSeconds,
    logQueryResponse,
  );
}

// Queries Prometheus scrape targets and waits for one or more targets with a matching job label to appear
export async function waitForPrometheusTarget(
  tenant: string,
  jobLabel: string,
  // Use a long timeout when waiting for prometheus scraper to see the pod.
  // Normally takes 5-15s, but can take longer than 30s
  maxWaitSeconds = 300,
) {
  const portForwardProm = new PortForward(
    `tenant-prometheus-${tenant}`, // name (arbitrary/logging)
    `statefulsets/prometheus-${tenant}-prometheus`, // k8sobj
    9090, // port_remote
    `${tenant}-tenant`, // namespace
  );
  const localPort = await portForwardProm.setup();

  try {
    const url = `http://127.0.0.1:${localPort}/prometheus/api/v1/targets`;
    const qparms = new URLSearchParams({state: "active"});

    log.info(`Waiting for target with tenant=${tenant} job=${jobLabel} via port-forward: ${url}`)
    await waitForQueryResult(
      () => queryJSONAPI(url, qparms),
      (data) => {
        // Example data: https://prometheus.io/docs/prometheus/latest/querying/api/#targets
        // Search for target(s) with matching job label
        const targets: Array<any> = data["data"]["activeTargets"];
        const filtered = targets.filter(target => target["labels"]["job"] === jobLabel);
        if (filtered.length == 0) {
          // Not found yet
          return null;
        }
        log.info(
          "Found tenant prometheus scrape targets for job=%s: %s",
          jobLabel,
          filtered
            .map(t => `${t["labels"]["job"]}:${t["labels"]["namespace"]}/${t["labels"]["pod"]}`)
            .sort()
        );
        return filtered;
      },
      maxWaitSeconds,
      false, // This is VERY long for system tenant, so don't log
    );
  } finally {
    await portForwardProm.terminate();
  }
}
