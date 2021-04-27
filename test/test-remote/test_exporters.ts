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

// Deploys exporter instances and checks that their metrics appear in Cortex.
// Cloud exporters are currently just configured with bogus credentials,
// where we just check that their respective 'auth failed' metric is incremented.

import { strict as assert } from "assert";
import { ZonedDateTime } from "@js-joda/core";

import got from "got";
import * as yamlParser from "js-yaml";

import {
  enrichHeadersWithAuthTokenFile,
  globalTestSuiteSetupOnce,
  httpTimeoutSettings,
  log,
  logHTTPResponse,
  rndstring,
  timestampToNanoSinceEpoch,
  CLUSTER_BASE_URL,
  CORTEX_API_TLS_VERIFY,
  TENANT_DEFAULT_API_TOKEN_FILEPATH,
  TENANT_DEFAULT_CORTEX_API_BASE_URL,
  TENANT_SYSTEM_API_TOKEN_FILEPATH,
  TENANT_SYSTEM_CORTEX_API_BASE_URL,
  TENANT_SYSTEM_LOKI_API_BASE_URL,
} from "./testutils";

import {
  waitForCortexMetricResult,
  waitForPrometheusTarget,
} from "./testutils/metrics";

import {
  waitForLokiQueryResult,
  LokiQueryResult,
} from "./testutils/logs";

async function listConfigNames(authTokenFilepath: string | undefined, urlSuffix: string): Promise<string[]> {
  const getResponse = await got.get(
    `${CLUSTER_BASE_URL}/api/v1/${urlSuffix}`,
    {
      throwHttpErrors: false,
      timeout: httpTimeoutSettings,
      headers: enrichHeadersWithAuthTokenFile(authTokenFilepath, {}),
      https: { rejectUnauthorized: CORTEX_API_TLS_VERIFY }
    }
  );
  logHTTPResponse(getResponse);
  assert(getResponse.statusCode == 200);
  const body: Record<string, string>[] = yamlParser.load(getResponse.body);
  return body.map(entry => entry["name"]);
}

async function storeConfig(authTokenFilepath: string | undefined, urlSuffix: string, config: string) {
  const postResponse = await got.post(
    `${CLUSTER_BASE_URL}/api/v1/${urlSuffix}`,
    {
      body: config,
      throwHttpErrors: false,
      timeout: httpTimeoutSettings,
      headers: enrichHeadersWithAuthTokenFile(authTokenFilepath, {}),
      https: { rejectUnauthorized: CORTEX_API_TLS_VERIFY }
    }
  );
  logHTTPResponse(postResponse);
  assert(postResponse.statusCode == 200);
}

async function deleteAllConfigs(authTokenFilepath: string | undefined, urlSuffix: string) {
  for (const name of await listConfigNames(authTokenFilepath, urlSuffix)) {
    await deleteConfig(authTokenFilepath, urlSuffix, name);
  }
}

async function deleteConfig(authTokenFilepath: string | undefined, urlSuffix: string, name: string) {
  const deleteResponse = await got.delete(
    `${CLUSTER_BASE_URL}/api/v1/${urlSuffix}/${name}`,
    {
      throwHttpErrors: false,
      timeout: httpTimeoutSettings,
      headers: enrichHeadersWithAuthTokenFile(authTokenFilepath, {}),
      https: { rejectUnauthorized: CORTEX_API_TLS_VERIFY }
    }
  );
  logHTTPResponse(deleteResponse);
  assert(deleteResponse.statusCode == 200);
}

async function setupExporter(
  authTokenFilepath: string | undefined,
  exporterConfig: string,
  credentialContent: string | null,
) {
  if (credentialContent != null) {
    await storeConfig(authTokenFilepath, "credentials", credentialContent);
  }
  await storeConfig(authTokenFilepath, "exporters", exporterConfig);
}

async function cleanExporter(authTokenFilepath: string | undefined) {
  log.info("Deleting exporters/credentials");
  await deleteAllConfigs(authTokenFilepath, "exporters");
  await deleteAllConfigs(authTokenFilepath, "credentials");
}

async function getExporterMetric(cortexBaseUrl: string, query: string): Promise<string> {
  log.info(`Waiting for exporter metric: ${query}`);

  // Instant query - get current value
  // https://prometheus.io/docs/prometheus/latest/querying/api/#instant-queries
  const queryParams = {
    query,
  };
  const resultArray = await waitForCortexMetricResult(
    cortexBaseUrl,
    queryParams,
    "query",
    300 // normally <10s, but needs to be longer because stackdriver exporter can be slow to perform first scrape
  );

  const value = resultArray[0]["value"][1];
  log.info(`Got exporter metric for query=${query}: ${value}`);
  return value;
}

async function getExporterLog(exporterNamespace: string, exporterName: string, logMessage: string): Promise<LokiQueryResult> {
  const query = `{k8s_namespace_name="${exporterNamespace}",k8s_container_name="exporter",k8s_pod_name=~"exporter-${exporterName}-.+"} |= "${logMessage}"`;
  log.info(`Waiting for exporter log: ${query}`);

  const ts = ZonedDateTime.now();
  const queryParams = {
    query,
    direction: "BACKWARD",
    limit: "10",
    start: timestampToNanoSinceEpoch(ts.minusHours(1)),
    end: timestampToNanoSinceEpoch(ts.plusHours(1))
  };

  const entries = await waitForLokiQueryResult(
    TENANT_SYSTEM_LOKI_API_BASE_URL,
    queryParams,
    undefined, // expectedEntryCount
    false, // logDetails
    1, // expectedStreamCount
    true, // buildhash
    // Default is 30s, which is plenty for default-tenant.
    // Meanwhile system-tenant seems to take as long as 62s for an entry to appear.
    120 // maxWaitSeconds
  );
  log.info(`Got exporter log for query=${query}: ${entries.entries}`);
  return entries;
}

async function testExporterMetric(
  tenant: string,
  cortexBaseUrl: string,
  authTokenFilepath: string | undefined,
  jobName: string,
  exporterConfig: string,
  credentialContent: string | null,
  expectedMetricQuery: string
) {
  await setupExporter(authTokenFilepath, exporterConfig, credentialContent);

  await waitForPrometheusTarget(tenant, jobName);
  await getExporterMetric(cortexBaseUrl, expectedMetricQuery);

  await cleanExporter(authTokenFilepath);
}

async function testExporterLog(
  authTokenFilepath: string | undefined,
  exporterConfig: string,
  credentialContent: string | null,
  exporterNamespace: string,
  exporterName: string,
  logMessage: string
) {
  await setupExporter(authTokenFilepath, exporterConfig, credentialContent);

  await getExporterLog(exporterNamespace, exporterName, logMessage);

  await cleanExporter(authTokenFilepath);
}

function getExporterName(type: string) {
  // The exporter name is used in the K8s deployment name.
  // As such, the exporter name can only contain letters, numbers, and '-'.
  // rndstring() can return '_', so replace all '_'s with '0' just so that they fit.
  // (use regex with /g to ensure ALL instances are replaced)
  return `testexporters-${rndstring().slice(0, 5).toLowerCase().replace(/_/g, '0')}-${type}`;
}

suite("Metric exporter tests", function () {
  suiteSetup(async function () {
    log.info("suite setup");
    globalTestSuiteSetupOnce();

    log.info("Deleting any preexisting exporters/credentials");
    await cleanExporter(TENANT_DEFAULT_API_TOKEN_FILEPATH);
    await cleanExporter(TENANT_SYSTEM_API_TOKEN_FILEPATH);
  });

  suiteTeardown(async function () {
    log.info("suite teardown");
  });

  test("Cloudwatch exporter", async function () {
    const exporterName = getExporterName("cloudwatch");
    const exporterConfig = `
name: ${exporterName}
type: cloudwatch
credential: ${exporterName}
# nested yaml payload defined by cloudwatch exporter:
config:
  region: us-west-2
  metrics:
  - aws_namespace: Buildkite
    aws_metric_name: ScheduledJobsCount
    aws_dimensions: [Org, Queue]
    aws_statistics: [Sum]
  - aws_namespace: Buildkite
    aws_metric_name: RunningJobsCount
    aws_dimensions: [Org, Queue]
    aws_statistics: [Sum]
  - aws_namespace: Buildkite
    aws_metric_name: WaitingJobsCount
    aws_dimensions: [Org, Queue]
    aws_statistics: [Sum]
`;
    // Bogus credential value. Just check for an "auth failed" metric.
    const exporterCred = `
name: ${exporterName}
type: aws-key
value:
  AWS_ACCESS_KEY_ID: foo
  AWS_SECRET_ACCESS_KEY: bar
`;

    const jobName = `exporter-${exporterName}`;
    const metricQuery = `cloudwatch_exporter_scrape_error{job="${jobName}"}`;

    await testExporterMetric(
      "default",
      TENANT_DEFAULT_CORTEX_API_BASE_URL,
      TENANT_DEFAULT_API_TOKEN_FILEPATH,
      jobName,
      exporterConfig,
      exporterCred,
      metricQuery
    );
    await testExporterMetric(
      "system",
      TENANT_SYSTEM_CORTEX_API_BASE_URL,
      TENANT_SYSTEM_API_TOKEN_FILEPATH,
      jobName,
      exporterConfig,
      exporterCred,
      metricQuery
    );
  });


  test("Stackdriver exporter", async function () {
    const exporterName = getExporterName("stackdriver");
    const exporterConfig = `
name: ${exporterName}
type: stackdriver
credential: ${exporterName}
config:
  monitoring.metrics-type-prefixes:
  - compute.googleapis.com/instance/cpu
  - compute.googleapis.com/instance/disk
  google.project-id:
  - phony-project-12345
  monitoring.metrics-interval: '5m'
  monitoring.metrics-offset: '0s'
`;
    // Bogus credential value. Just check for an "auth failed" metric.
    const exporterCred = `
name: ${exporterName}
type: gcp-service-account
value: |-
  {
    "type": "service_account",
    "project_id": "phony-project-12345",
    "private_key_id": "phony_id",
    "private_key": "phony_key"
  }
`;

    const jobName = `exporter-${exporterName}`;
    // this metric can take >30s to appear:
    const metricQuery = `stackdriver_monitoring_scrape_errors_total{job="${jobName}"}`;

    await testExporterMetric(
      "default",
      TENANT_DEFAULT_CORTEX_API_BASE_URL,
      TENANT_DEFAULT_API_TOKEN_FILEPATH,
      jobName,
      exporterConfig,
      exporterCred,
      metricQuery
    );
    await testExporterMetric(
      "system",
      TENANT_SYSTEM_CORTEX_API_BASE_URL,
      TENANT_SYSTEM_API_TOKEN_FILEPATH,
      jobName,
      exporterConfig,
      exporterCred,
      metricQuery
    );
  });


  test("Blackbox exporter", async function () {
    const exporterName = getExporterName("blackbox");
    const exporterConfig = `
name: ${exporterName}
type: blackbox
config:
  probes:
  - target: prometheus.io
    module: http_2xx
  - target: example.com
    module: http_2xx
  - target: 1.1.1.1
    module: dns_opstrace_mx
  - target: 8.8.8.8
    module: dns_opstrace_mx
  modules:
    http_2xx:
      prober: http
      timeout: 5s
      http:
        preferred_ip_protocol: "ip4"
    dns_opstrace_mx:
      prober: dns
      timeout: 5s
      dns:
        preferred_ip_protocol: "ip4"
        transport_protocol: tcp
        dns_over_tls: true
        query_name: opstrace.com
        query_type: MX
`;
    const jobName = `exporter-${exporterName}`;
    // The probe metrics should be labeled with module and target params:
    const metricQuery = `probe_success{job="${jobName}",module="http_2xx",target="example.com"}`;

    await testExporterMetric(
      "default",
      TENANT_DEFAULT_CORTEX_API_BASE_URL,
      TENANT_DEFAULT_API_TOKEN_FILEPATH,
      jobName,
      exporterConfig,
      null,
      metricQuery
    );
    await testExporterMetric(
      "system",
      TENANT_SYSTEM_CORTEX_API_BASE_URL,
      TENANT_SYSTEM_API_TOKEN_FILEPATH,
      jobName,
      exporterConfig,
      null,
      metricQuery
    );
  });

  test("Azure exporter", async function () {
    const exporterName = getExporterName("azure");
    const exporterConfig = `
name: ${exporterName}
type: azure
credential: ${exporterName}
config:
  resource_groups:
  - resource_group: mygroup
    resource_types:
    - "Microsoft.Storage/storageAccounts"
    metrics:
    - name: Availability
    - name: Egress
    - name: Ingress
    - name: SuccessE2ELatency
    - name: SuccessServerLatency
    - name: Transactions
    - name: UsedCapacity
`;
    // Bogus credential value. Just check for an "auth failed" log message.
    const exporterCred = `
name: ${exporterName}
type: azure-service-principal
value:
  AZURE_SUBSCRIPTION_ID: foo
  AZURE_TENANT_ID: testtenantshouldfail
  AZURE_CLIENT_ID: bar
  AZURE_CLIENT_SECRET: baz
`;
    const expectedLogMessage = "Tenant 'testtenantshouldfail' not found";

    await testExporterLog(
      TENANT_DEFAULT_API_TOKEN_FILEPATH,
      exporterConfig,
      exporterCred,
      "default-tenant",
      exporterName,
      expectedLogMessage
    );
    await testExporterLog(
      TENANT_SYSTEM_API_TOKEN_FILEPATH,
      exporterConfig,
      exporterCred,
      "system-tenant",
      exporterName,
      expectedLogMessage
    );
  });
});
