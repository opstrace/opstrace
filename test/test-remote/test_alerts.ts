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

// Deploys the 'e2ealerting' tool for firing alerts and checking that they are received.
// See also: https://github.com/grafana/cortex-tools/blob/main/docs/e2ealerting.md
//
// The chain works like this:
// - The test deploys an e2ealerting pod
// - e2ealerting pod serves a metric: e2ealerting_webhook_receiver_end_to_end_duration_seconds
// - the metric is scraped by the tenant prometheus
// - the tenant prometheus forwards it to cortex against the tenant (X-Scope-OrgId)
// - cortex ruler has been configured with an alert rule to always fire against the metric
// - cortex alertmanager has been configured to report firing rules back to e2ealerting via a webhook endpoint
// - e2ealerting receives the alert, and then increments e2ealerting_webhook_receiver_evaluations_total
//
// So, what we need to do is:
// - Deploy e2ealerting and configure scraping of its metrics endpoint so that metrics get into cortex
// - Configure cortex ruler to fire against the e2ealerting metric
// - Configure cortex alertmanager for the tenant to send alerts back to e2ealerting
//
// This will validate:
// - That scraped metrics from a tenant pod are getting into cortex automatically
//   If this fails, then maybe the tenant prometheus isnt routing metrics into cortex?
// - That we can configure cortex ruler/alertmanager for the tenant via Opstrace config-api endpoints
//   If this fails, then maybe there is a regression in config-api, the cortex APIs, or the K8s ingress config?
// - That the cortex tenant ruler/alertmanager work and send alerts as configured
//   If this fails, then maybe there is a config issue or regression in cortex ruler/alertmanager?

import { strict as assert } from "assert";

import got from "got";

import { KubeConfig } from "@kubernetes/client-node";

import {
  Deployment,
  K8sResource,
  Service,
  V1ServicemonitorResource,
  kubernetesError
} from "@opstrace/kubernetes";

import {
  enrichHeadersWithAuthTokenFile,
  globalTestSuiteSetupOnce,
  httpTimeoutSettings,
  log,
  logHTTPResponse,
  mtime,
  mtimeDeadlineInSeconds,
  rndstring,
  sleep,
  CLUSTER_BASE_URL,
  CORTEX_API_TLS_VERIFY,
  TENANT_DEFAULT_API_TOKEN_FILEPATH,
  TENANT_DEFAULT_CORTEX_API_BASE_URL,
  TENANT_SYSTEM_API_TOKEN_FILEPATH,
  TENANT_SYSTEM_CORTEX_API_BASE_URL
} from "./testutils";

import {
  waitForCortexMetricResult,
  waitForPrometheusTarget
} from "./testutils/metrics";

function getE2EAlertingResources(
  tenant: string,
  job: string
): Array<K8sResource> {
  // The test environment should already have kubectl working, so we can use that.
  const kubeConfig = new KubeConfig();
  kubeConfig.loadFromDefault();
  // loadFromDefault will fall back to e.g. localhost if it cant find something.
  // So let's explicitly try to communicate with the cluster.
  const kubeContext = kubeConfig.getCurrentContext();
  if (kubeContext === null) {
    throw new Error(
      "Unable to communicate with kubernetes cluster. Is kubectl set up?"
    );
  }

  const name = "e2ealerting";
  const namespace = `${tenant}-tenant`;
  const matchLabels = {
    app: name,
    tenant
  };
  // With a randomized 'job' label that will appear in metrics
  const labels = {
    app: name,
    tenant,
    job
  };

  const resources: Array<K8sResource> = [];

  resources.push(
    new Deployment(
      {
        apiVersion: "apps/v1",
        kind: "Deployment",
        metadata: {
          name,
          namespace,
          labels
        },
        spec: {
          replicas: 1,
          selector: {
            matchLabels
          },
          template: {
            metadata: {
              labels
            },
            spec: {
              containers: [
                {
                  name: "e2ealerting",
                  image: "grafana/e2ealerting:master-db38b142",
                  args: ["-server.http-listen-port=8080", "-log.level=debug"],
                  ports: [{ name: "http", containerPort: 8080 }],
                  livenessProbe: {
                    httpGet: {
                      path: "/metrics",
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      port: "http" as any,
                      scheme: "HTTP"
                    },
                    periodSeconds: 10,
                    successThreshold: 1,
                    failureThreshold: 3,
                    timeoutSeconds: 1
                  }
                }
              ]
            }
          }
        }
      },
      kubeConfig
    )
  );

  resources.push(
    new Service(
      {
        apiVersion: "v1",
        kind: "Service",
        metadata: {
          name,
          namespace,
          labels
        },
        spec: {
          ports: [
            {
              name: "http",
              port: 80,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: "http" as any
            }
          ],
          selector: labels
        }
      },
      kubeConfig
    )
  );

  resources.push(
    new V1ServicemonitorResource(
      {
        apiVersion: "monitoring.coreos.com/v1",
        kind: "ServiceMonitor",
        metadata: {
          name,
          namespace,
          labels
        },
        spec: {
          jobLabel: "job", // point to 'job' label in the pod
          endpoints: [
            {
              // Spam it at 5s to get faster responses in tests
              interval: "5s",
              port: "http",
              path: "/metrics"
            }
          ],
          selector: {
            matchLabels
          }
        }
      },
      kubeConfig
    )
  );

  return resources;
}

async function storeE2EAlertsConfig(authTokenFilepath: string | undefined, tenant: string) {
  // Configure tenant alertmanager to send alerts to e2ealerting service
  // Using cortex API proxied via config-api: https://cortexmetrics.io/docs/api/#set-alertmanager-configuration
  const alertmanagerConfigUrl = `${CLUSTER_BASE_URL}/api/v1/alerts`;
  const alertmanagerPostResponse = await got.post(alertmanagerConfigUrl, {
    body: `alertmanager_config: |
  receivers:
    - name: e2e-alerting
      webhook_configs:
        - url: http://e2ealerting.${tenant}-tenant.svc.cluster.local/api/v1/receiver
  route:
      group_interval: 1s
      group_wait: 1s
      receiver: e2e-alerting
      repeat_interval: 1s
`,
    throwHttpErrors: false,
    timeout: httpTimeoutSettings,
    headers: enrichHeadersWithAuthTokenFile(authTokenFilepath, {}),
    https: { rejectUnauthorized: CORTEX_API_TLS_VERIFY }
  });
  logHTTPResponse(alertmanagerPostResponse);
  assert(
    alertmanagerPostResponse.statusCode == 201 ||
      alertmanagerPostResponse.statusCode == 202
  );

  // Configure tenant ruler to fire alert against metric scraped from e2ealerting pod
  // Using cortex API proxied via config-api: https://cortexmetrics.io/docs/api/#set-rule-group
  const ruleGroupConfigUrl = `${CLUSTER_BASE_URL}/api/v1/rules/testremote`;
  const ruleGroupPostResponse = await got.post(ruleGroupConfigUrl, {
    body: `name: e2ealerting
rules:
  - alert: E2EAlertingAlwaysFiring
    annotations:
        time: '{{ $value }}'
    expr: e2ealerting_now_in_seconds > 0
    for: 5s
`,
    throwHttpErrors: false,
    timeout: httpTimeoutSettings,
    headers: enrichHeadersWithAuthTokenFile(authTokenFilepath, {}),
    https: { rejectUnauthorized: CORTEX_API_TLS_VERIFY }
  });
  logHTTPResponse(ruleGroupPostResponse);
  assert(
    ruleGroupPostResponse.statusCode == 201 ||
      ruleGroupPostResponse.statusCode == 202
  );
}

async function deleteE2EAlertsConfig(authTokenFilepath: string | undefined) {
  // Delete any alertmanager config created for tenant earlier
  // Using cortex API proxied via config-api: https://cortexmetrics.io/docs/api/#delete-alertmanager-configuration
  const alertmanagerConfigUrl = `${CLUSTER_BASE_URL}/api/v1/alerts`;
  const alertmanagerDeleteResponse = await got.delete(alertmanagerConfigUrl, {
    throwHttpErrors: false,
    timeout: httpTimeoutSettings,
    headers: enrichHeadersWithAuthTokenFile(authTokenFilepath, {}),
    https: { rejectUnauthorized: CORTEX_API_TLS_VERIFY }
  });
  logHTTPResponse(alertmanagerDeleteResponse);
  assert(
    alertmanagerDeleteResponse.statusCode == 202 ||
      alertmanagerDeleteResponse.statusCode == 200
  );

  // Delete any 'testremote' rule namespace created for tenant earlier
  // Using cortex API proxied via config-api: https://cortexmetrics.io/docs/api/#delete-namespace
  const ruleGroupConfigUrl = `${CLUSTER_BASE_URL}/api/v1/rules/testremote`;
  const ruleGroupDeleteResponse = await got.delete(ruleGroupConfigUrl, {
    throwHttpErrors: false,
    timeout: httpTimeoutSettings,
    headers: enrichHeadersWithAuthTokenFile(authTokenFilepath, {}),
    https: { rejectUnauthorized: CORTEX_API_TLS_VERIFY }
  });
  logHTTPResponse(ruleGroupDeleteResponse);
  assert(
    ruleGroupDeleteResponse.statusCode == 202 ||
      ruleGroupDeleteResponse.statusCode == 404
  );
}

async function getE2EAlertCountMetric(
  cortexBaseUrl: string,
  uniqueScrapeJobName: string
): Promise<string> {
  // Instant query - get current value
  // https://prometheus.io/docs/prometheus/latest/querying/api/#instant-queries
  const queryParams = {
    query: `e2ealerting_webhook_receiver_evaluations_total{job="${uniqueScrapeJobName}"}`
  };
  const resultArray = await waitForCortexMetricResult(
    cortexBaseUrl,
    queryParams,
    "query"
  );

  // Sanity check: label should match
  assert.strictEqual(
    resultArray[0]["metric"]["job"],
    uniqueScrapeJobName,
    "Expected to get matching job label for e2ealerting webhook metric: ${resultArray}"
  );

  const value = resultArray[0]["value"][1];

  // debug-log for 0 to reduce verbosity
  if (value === 0) {
    log.debug(`Got alert count value: ${value}`);
  } else {
    log.info(`Got alert count value: ${value}`);
  }

  return value;
}

async function setupE2EAlertsForTenant(
  authTokenFilepath: string | undefined,
  tenant: string,
  uniqueScrapeJobName: string
): Promise<Array<K8sResource>> {
  // Before deploying anything, delete any existing alertmanager/rulegroup configuration.
  // This avoids an old alert config writing to the newly deployed webhook, making its hit count 1 when we expect 0
  // This should only be a problem when running the same test repeatedly against a cluster.
  log.info("Deleting any preexisting E2E alerts webhook");
  await deleteE2EAlertsConfig(authTokenFilepath);

  log.info("Setting up E2E alerts webhook");
  await storeE2EAlertsConfig(authTokenFilepath, tenant);

  log.info(`Deploying E2E alerting resources into ${tenant}-tenant namespace`);
  const resources = getE2EAlertingResources(tenant, uniqueScrapeJobName);
  for (const r of resources) {
    try {
      log.info(`Try to create ${r.constructor.name}: ${r.namespace}/${r.name}`);
      await r.create();
    } catch (e) {
      const err = kubernetesError(e);
      if (err.statusCode === 409) {
        // If we're re-running the test against a cluster, ensure things like job labels are updated.
        log.info("Already exists, doing an update");
        try {
          await r.update();
        } catch (e2) {
          const err2 = kubernetesError(e2);
          log.error(`update failed with error: ${err2.message}`);
          throw e2;
        }
      } else {
        log.error(`create failed with error: ${err.message}`);
        throw e;
      }
    }
  }

  return resources;
}

async function waitForE2EAlertFiring(
  cortexBaseUrl: string,
  tenant: string,
  uniqueScrapeJobName: string
) {
  // Wait for the E2E pod to appear in prometheus scrape targets
  // This separate check shouldn't contribute to the time spent on the test, and can help with tracing a test failure.
  log.info(
    `Waiting for E2E scrape target to appear in tenant prometheus for tenant=${tenant} job=${uniqueScrapeJobName}`
  );
  await waitForPrometheusTarget(tenant, uniqueScrapeJobName);

  // With the alert outputs configured earlier, wait for the e2ealerting webhook to be queried
  // and the count of evaluations to be incremented at least once.
  log.info(
    `Waiting for cortex E2E alerting metric for tenant=${tenant} job=${uniqueScrapeJobName} with nonzero value`
  );
  const deadline = mtimeDeadlineInSeconds(300);
  while (true) {
    if (mtime() > deadline) {
      throw new Error(
        "Failed to get non-zero alerts metric value after 300s. Are alerts successfully reaching the e2ealerting pod?"
      );
    }

    const value = await getE2EAlertCountMetric(
      cortexBaseUrl,
      uniqueScrapeJobName
    );
    if (value !== "0") {
      log.info(`Got alerts metric value for tenant ${tenant}: ${value}`);
      break;
    }

    await sleep(15.0);
  }
}

suite("End-to-end alert tests", function () {
  suiteSetup(async function () {
    log.info("suite setup");
    globalTestSuiteSetupOnce();
  });

  suiteTeardown(async function () {
    log.info("suite teardown");
  });

  test("End-to-end alerts for default and system tenants", async function () {
    // Give a random token to include for the 'job' label in metrics.
    // This is just in case e.g. tests are re-run against the same cluster.
    // Include '-job' at the end just to avoid punctuation at the end of the label which K8s disallows
    const defaultUniqueScrapeJobName = `testalerts-default-${rndstring().slice(0, 5)}-job`;
    const systemUniqueScrapeJobName = `testalerts-system-${rndstring().slice(0, 5)}-job`;

    // To save time, we set up the default and system tenant E2E environments in parallel
    const defaultTestResources = await setupE2EAlertsForTenant(
      TENANT_DEFAULT_API_TOKEN_FILEPATH,
      "default",
      defaultUniqueScrapeJobName
    );
    const systemTestResources = await setupE2EAlertsForTenant(
      TENANT_SYSTEM_API_TOKEN_FILEPATH,
      "system",
      systemUniqueScrapeJobName
    );
    const testResources = defaultTestResources.concat(systemTestResources);

    // With everything deployed, wait for each of the tenants' alerts to start firing
    await waitForE2EAlertFiring(
      TENANT_DEFAULT_CORTEX_API_BASE_URL,
      "default",
      defaultUniqueScrapeJobName
    );
    await waitForE2EAlertFiring(
      TENANT_SYSTEM_CORTEX_API_BASE_URL,
      "system",
      systemUniqueScrapeJobName
    );

    // Clean up both tenants
    log.info("Deleting E2E alerts webhooks");
    await deleteE2EAlertsConfig(TENANT_DEFAULT_API_TOKEN_FILEPATH);
    await deleteE2EAlertsConfig(TENANT_SYSTEM_API_TOKEN_FILEPATH);

    log.info("Deleting E2E alerting resources")
    for (const r of testResources) {
      try {
        log.info(`Try to delete ${r.constructor.name}: ${r.namespace}/${r.name}`);
        await r.delete();
      } catch (e) {
        const err = kubernetesError(e);
        if (err.statusCode === 404) {
          log.info("already doesn't exist");
        } else {
          throw e;
        }
      }
    }
  });
});
