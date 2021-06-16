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

import { KubeConfig, V1EnvVar, V1PodSpec } from "@kubernetes/client-node";
import { DockerImages, getImagePullSecrets } from "@opstrace/controller-config";
import {
  ConfigMap,
  Deployment,
  K8sResource,
  ResourceCollection,
  Secret,
  Service,
  V1ServicemonitorResource
} from "@opstrace/kubernetes";
import { Integration } from "../../reducers/graphql/integrations";
import { toTenantName, toTenantNamespace } from "../../helpers";
import { State } from "../../reducer";
import { log } from "@opstrace/utils";

export function IntegrationResources(
  state: State,
  kubeConfig: KubeConfig
): ResourceCollection {
  const collection = new ResourceCollection();

  // Get all integrations from GraphQL/Postgres
  state.graphql.Integrations.resources.forEach(integration => {
    toKubeResources(state, integration, kubeConfig).forEach(resource =>
      collection.add(resource)
    );
  });

  return collection;
}

type BlackboxConfig = {
  // Probes, each entry in the array is a set of key value pairs to be set as params in the HTTP url.
  // Passed to the prometheus operator as endpoints to monitor.
  // For example {target: "example.com", module: "http_2xx"} -> "/probe?target=example.com&module=http_2xx"
  probes: { [key: string]: string }[];
  // Config listing modules that may be referenced by probes.
  // Passed to the blackbox integration configuration, or the default configuration is used if this is undefined.
  // For example this may configure an "http_2xx" module to be referenced by the probes.
  configFile: string | null;
};
type BlackboxIntegrationData = {
  // config: nested JSON object
  // These are processed by the controller:
  // - need to configure prometheus with the probe URLs
  // - need to configure labeling for each of the probes
  config: BlackboxConfig;
  // Blackbox doesn't use credentials, but we still nest the config under 'config' to allow later expansion if needed.
};

type CloudwatchIntegrationData = {
  // config: raw yaml file content passthrough
  config: string;
  // credentials: Envvar passthrough
  // In practice this is expected to contain AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
  credentials: { [key: string]: string };
};

type StackdriverIntegrationData = {
  // config: nested JSON object
  // The keys are expected to be strings like "google.project-id" which is converted to an "STACKDRIVER_EXPORTER_GOOGLE_PROJECT_ID" envvar.
  // The values are expected to either be strings or arrays of strings.
  config: Record<string, unknown>;
  // credentials: json file content passthrough
  credentials: string;
};

type AzureIntegrationData = {
  // config: raw yaml file content passthrough
  config: string;
  // credentials: Envvar passthrough
  // In practice this is expected to contain AZURE_SUBSCRIPTION_ID, AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET
  credentials: { [key: string]: string } | null;
};

const toKubeResources = (
  state: State,
  integration: Integration,
  kubeConfig: KubeConfig
): K8sResource[] => {
  // Name for any k8s objects like Deployment, ConfigMap, and/or Secret associated with this secret
  const k8sName = `integration-${integration.key}`;

  // Look up tenant name from the id
  const tenantName = toTenantName(
    integration.tenant_id,
    state.tenants.list.tenants
  );
  if (tenantName == null) {
    log.warning(
      "Skipping deployment of %s integration '%s': missing tenant_id=%s in local state: %s",
      integration.kind,
      integration.name,
      integration.tenant_id,
      state.tenants.list.tenants
    );
    return [];
  }
  const k8sLabels = {
    app: k8sName,
    // DO NOT remove tenant label: used by Prometheus operator to filter the ServiceMonitors
    tenant: tenantName,
    // DO NOT use user-provided integration.name: label values cannot contain e.g. spaces or symbols
    "opstrace.com/integration-key": integration.key,
    "opstrace.com/integration-kind": integration.kind
  };
  const k8sMetadata = {
    name: k8sName,
    namespace: toTenantNamespace(tenantName),
    labels: k8sLabels
  };

  const resources: Array<K8sResource> = [];
  let podSpec: V1PodSpec;
  const customMonitorEndpoints: Array<Record<string, unknown>> = [];
  // If the integration needs a configmap (named k8sName), the data is set here
  let configMapData: { [key: string]: string } | null = null;
  // If the integration needs a secret (named k8sName), the base64-encoded data is set here
  let secretData: { [key: string]: string } | null = null;

  if (integration.kind == "exporter-cloudwatch") {
    const integrationData = integration.data as CloudwatchIntegrationData;
    configMapData = { "config.yml": integrationData.config };
    secretData = integrationData.credentials;

    podSpec = {
      containers: [
        {
          name: "exporter",
          image: DockerImages.exporterCloudwatch,
          // Import all of the key/value pairs from the credentials as secrets.
          // For example this may include AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
          envFrom: [{ secretRef: { name: k8sName } }],
          ports: [{ name: "metrics", containerPort: 9106 }],
          volumeMounts: [{ name: "config", mountPath: "/config" }],
          // Use the 'healthy' endpoint
          // See https://github.com/prometheus/cloudwatch_exporter/blob/f0e84d6/src/main/java/io/prometheus/cloudwatch/WebServer.java#L43
          startupProbe: {
            httpGet: {
              path: "/-/healthy",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              port: "metrics" as any
            },
            failureThreshold: 3,
            initialDelaySeconds: 10,
            periodSeconds: 30,
            successThreshold: 1,
            timeoutSeconds: 5
          }
        }
      ],
      volumes: [
        {
          name: "config",
          configMap: {
            name: k8sName
          }
        }
      ]
    };
  } else if (integration.kind == "exporter-cloud-monitoring") {
    const integrationData = integration.data as StackdriverIntegrationData;
    secretData = { "secret.json": integrationData.credentials };

    // We do not support changing the following envvars, because they are part of the integration:
    // - GOOGLE_APPLICATION_CREDENTIALS must be "/credential/secret.json"
    // - STACKDRIVER_EXPORTER_WEB_LISTEN_ADDRESS must be ":9255" (default)
    // - STACKDRIVER_EXPORTER_WEB_TELEMETRY_PATH must be "/metrics" (default)
    // To enforce this, we always set these envvars, and block the user from overriding them.
    const env: Array<V1EnvVar> = [];
    env.push({
      name: "GOOGLE_APPLICATION_CREDENTIALS",
      value: "/credential/secret.json"
    });
    env.push({
      name: "STACKDRIVER_EXPORTER_WEB_LISTEN_ADDRESS",
      value: ":9255"
    });
    env.push({
      name: "STACKDRIVER_EXPORTER_WEB_TELEMETRY_PATH",
      value: "/metrics"
    });

    const bannedEnv = new Set<string>();
    env.forEach(e => bannedEnv.add(e.name));

    // For now we just pass through all configuration options as envvars.
    // However, changing some of thees options might cause problems.
    // For example we assume that the following are left with their defaults:
    Object.entries(integrationData.config).forEach(([k, v]) => {
      // Env name: Add prefix, uppercase, and replace any punctuation with '_'
      // Example: google.project-id => STACKDRIVER_EXPORTER_GOOGLE_PROJECT_ID
      const name =
        "STACKDRIVER_EXPORTER_" + k.toUpperCase().replace(/\W/g, "_");
      if (bannedEnv.has(name)) {
        // Disallow user override of this env setting
        return;
      }
      // Env value: Original string as-is, or array converted to comma-separated string.
      const value =
        v instanceof Array
          ? v.toString() // convert array to comma-separated string (e.g. ["foo","bar"] => "foo,bar" without [])
          : (v as string); // plain string conversion, but for arrays this would include the []
      env.push({ name, value });
    });

    podSpec = {
      containers: [
        {
          name: "exporter",
          image: DockerImages.exporterStackdriver,
          env,
          ports: [{ name: "metrics", containerPort: 9255 }],
          volumeMounts: [{ name: "credential", mountPath: "/credential" }],
          // Use the root path, which just returns a stub HTML page
          // see https://github.com/prometheus-community/stackdriver_exporter/blob/42badeb/stackdriver_integration.go#L178
          startupProbe: {
            httpGet: {
              path: "/",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              port: "metrics" as any
            },
            failureThreshold: 3,
            initialDelaySeconds: 10,
            periodSeconds: 30,
            successThreshold: 1,
            timeoutSeconds: 5
          }
        }
      ],
      volumes: [
        {
          name: "credential",
          secret: {
            secretName: k8sName
          }
        }
      ]
    };
  } else if (integration.kind == "exporter-azure") {
    const integrationData = integration.data as AzureIntegrationData;
    configMapData = { "azure.yml": integrationData.config };
    secretData = integrationData.credentials;

    podSpec = {
      containers: [
        {
          name: "exporter",
          image: DockerImages.exporterAzure,
          command: [
            "/bin/azure_metrics_exporter",
            "--config.file=/config/azure.yml"
          ],
          // Import all of the key/value pairs from the credentials as secrets.
          // For example create AZURE_TENANT_ID and AZURE_CLIENT_ID envvars.
          envFrom: [{ secretRef: { name: k8sName } }],
          ports: [{ name: "metrics", containerPort: 9276 }],
          volumeMounts: [{ name: "config", mountPath: "/config" }],
          // Use the root path, which just returns a stub HTML page
          // see https://github.com/RobustPerception/azure_metrics_exporter/blob/f5baabe/main.go#L363
          startupProbe: {
            httpGet: {
              path: "/",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              port: "metrics" as any
            },
            failureThreshold: 3,
            initialDelaySeconds: 10,
            periodSeconds: 30,
            successThreshold: 1,
            timeoutSeconds: 5
          }
        }
      ],
      volumes: [
        {
          name: "config",
          configMap: { name: k8sName }
        }
      ]
    };
  } else if (integration.kind == "exporter-blackbox") {
    const integrationData = integration.data as BlackboxIntegrationData;
    const exporterConfig = integrationData.config;

    // modules: Override the default exporter module configuration yaml file (optional)
    if (exporterConfig.configFile) {
      configMapData = { "config.yml": exporterConfig.configFile };
    }

    // If modules is defined, configure configmap volume.
    // Line things up so that the config ends up at the default path of /etc/blackbox_exporter/config.yml
    podSpec = {
      imagePullSecrets: getImagePullSecrets(),
      containers: [
        {
          name: "exporter",
          image: DockerImages.exporterBlackbox,
          ports: [{ name: "metrics", containerPort: 9115 }],
          // Enable configmap mount if modules override is provided
          volumeMounts: exporterConfig.configFile
            ? [{ name: "config", mountPath: "/etc/blackbox_exporter" }]
            : [],
          // Use the 'healthy' endpoint
          // See https://github.com/prometheus/blackbox_exporter/blob/70bce1a/main.go#L312
          startupProbe: {
            httpGet: {
              path: "/-/healthy",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              port: "metrics" as any
            },
            failureThreshold: 3,
            initialDelaySeconds: 10,
            periodSeconds: 30,
            successThreshold: 1,
            timeoutSeconds: 5
          }
        }
      ],
      // Enable configmap mount if modules override is provided
      volumes: exporterConfig.configFile
        ? [{ name: "config", configMap: { name: k8sName } }]
        : []
    };

    // probes: List of probes to run against exporter modules (required)
    // We need to configure Prometheus to hit each of the specified probes.
    // Add the probes to the ServiceMonitor object as HTTP /probe queries
    if (!exporterConfig.probes) {
      log.warning(
        "Skipping deployment of blackbox integration %s/'%s': missing required 'probes' in config",
        integration.tenant_id,
        integration.name
      );
      return [];
    }
    for (const probeIdx in exporterConfig.probes) {
      // Convert the object values to be arrays to match ServiceMonitor schema:
      //   {module: "http_2xx", target: "example.com"} => {module: ["http_2xx"], target: ["example.com"]}
      const params = Object.fromEntries(
        Object.entries(exporterConfig.probes[probeIdx]).map(([k, v]) => [
          k,
          [v]
        ])
      );
      // Ensure that the per-probe metrics are each labeled with the probe info.
      // In practice this means that 'module' and 'target' labels should be included in the probe metrics.
      const relabelings = Object.entries(exporterConfig.probes[probeIdx]).map(
        ([k, v]) => ({
          sourceLabels: [],
          targetLabel: k,
          replacement: v
        })
      );
      // Ensure the default integration_id label is also being assigned.
      relabelings.push({
        sourceLabels: [],
        targetLabel: "integration_id",
        replacement: integration.id
      });
      customMonitorEndpoints.push({
        interval: "30s",
        port: "metrics",
        path: "/probe",
        // HTTP GET params must be provided as separate object field, not as part of path:
        params,
        relabelings
      });
    }
  } else {
    // Ignore unsupported integration, may not even be relevant to the controller.
    log.debug(
      "Ignoring integration %s/%s with kind: %s",
      integration.tenant_id,
      integration.id,
      integration.kind
    );
    return [];
  }

  resources.push(
    new Deployment(
      {
        apiVersion: "apps/v1",
        kind: "Deployment",
        metadata: k8sMetadata,
        spec: {
          replicas: 1,
          selector: {
            matchLabels: { app: k8sName }
          },
          template: {
            metadata: { labels: k8sLabels },
            spec: podSpec
          }
        }
      },
      kubeConfig
    )
  );

  // Service is (only) required by the ServiceMonitor
  resources.push(
    new Service(
      {
        apiVersion: "v1",
        kind: "Service",
        metadata: k8sMetadata,
        spec: {
          ports: [
            {
              name: "metrics",
              port: 9000,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: "metrics" as any
            }
          ],
          selector: { app: k8sName }
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
        metadata: k8sMetadata,
        spec: {
          // Use the name-derived integration key (value of this label) for the "job" annotation in metrics
          // Intent is to uniquely identify integrations in a user-friendly way, while avoiding weird issues around symbols/etc in the name.
          jobLabel: "opstrace.com/integration-key",
          endpoints:
            customMonitorEndpoints.length != 0
              ? customMonitorEndpoints
              : [
                  {
                    // Increase the timeout (default 10s).
                    // AWS/Cloudwatch exporter in particular was found to take ~16s
                    scrapeTimeout: "45s",
                    // Go with 60s so that it's at least larger than the above timeout
                    interval: "60s",
                    port: "metrics",
                    path: "/metrics",
                    // Inject an "integration_id" annotation in metrics
                    relabelings: [
                      {
                        sourceLabels: [],
                        targetLabel: "integration_id",
                        replacement: integration.id
                      }
                    ]
                  }
                ],
          selector: {
            matchLabels: { app: k8sName }
          }
        }
      },
      kubeConfig
    )
  );

  if (configMapData) {
    resources.push(
      new ConfigMap(
        {
          apiVersion: "v1",
          kind: "ConfigMap",
          metadata: k8sMetadata,
          data: configMapData
        },
        kubeConfig
      )
    );
  }

  if (secretData) {
    // K8s wants Secret values to be base64-encoded
    const datab64 = Object.fromEntries(
      Object.entries(secretData).map(([k, v]) => [
        k,
        Buffer.from(v).toString("base64")
      ])
    );

    resources.push(
      new Secret(
        {
          apiVersion: "v1",
          kind: "Secret",
          metadata: k8sMetadata,
          data: datab64
        },
        kubeConfig
      )
    );
  }

  return resources;
};
