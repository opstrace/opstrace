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

import yaml from "js-yaml";
import { KubeConfig, V1EnvVar, V1PodSpec } from "@kubernetes/client-node";
import { DockerImages } from "@opstrace/controller-config";
import {
  ConfigMap,
  Deployment,
  K8sResource,
  ResourceCollection,
  Service,
  V1ServicemonitorResource
} from "@opstrace/kubernetes";
import { Exporter } from "../../reducers/graphql/exporters";
import { toTenantNamespace } from "../../helpers";
import { State } from "../../reducer";
import { log } from "@opstrace/utils";

export function ExporterResources(
  state: State,
  kubeConfig: KubeConfig
): ResourceCollection {
  const collection = new ResourceCollection();

  // Get all exporters from GraphQL/Postgres
  state.graphql.Exporters.resources.forEach(exporter => {
    toKubeResources(exporter, kubeConfig).forEach(resource => collection.add(resource));
  });

  return collection;
}

type BlackboxConfig = {
  // Probes, each entry in the array is a set of key value pairs to be set as params in the HTTP url.
  // Passed to the prometheus operator as endpoints to monitor.
  // For example {target: "example.com", module: "http_2xx"} -> "/probe?target=example.com&module=http_2xx"
  probes: Record<string, string>[] | undefined,
  // Modules that may be referenced by probes.
  // Passed to the blackbox exporter configuration, or the default configuration is used if this is undefined.
  // For example this may configure an "http_2xx" module to be referenced by the probes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modules: any | undefined
};

const toKubeResources = (
  exporter: Exporter,
  kubeConfig: KubeConfig,
): K8sResource[] => {
  const name = `exporter-${exporter.name}`;
  const namespace = toTenantNamespace(exporter.tenant);
  const labels = {
    tenant: exporter.tenant,
    app: name,
    "opstrace.com/exporter-name": exporter.name,
    "opstrace.com/exporter-type": exporter.type,
    "opstrace.com/exporter-version": "1",
  };

  const resources: Array<K8sResource> = [];
  let podSpec: V1PodSpec;
  const monitorEndpoints: Array<Record<string, unknown>> = [];
  if (exporter.type == "cloudwatch") {
    resources.push(
      new ConfigMap(
        {
          apiVersion: "v1",
          kind: "ConfigMap",
          // Use name/labels that match the Deployment
          metadata: {
            name,
            namespace,
            labels
          },
          data: {
            // Convert JSON string to YAML string
            "config.yml": yaml.dump(JSON.parse(exporter.config))
          }
        },
        kubeConfig
      )
    );

    podSpec = {
      containers: [{
        name: "exporter",
        image: DockerImages.exporterCloudwatch,
        // Enable credential env if credential is specified
        env: (exporter.credential)
          ? [{
            name: "AWS_SECRET_ACCESS_KEY",
            valueFrom: {
              secretKeyRef: { name: `credential-${exporter.credential}`, key: "AWS_SECRET_ACCESS_KEY" }
            }
          }, {
            name: "AWS_ACCESS_KEY_ID",
            valueFrom: {
              secretKeyRef: { name: `credential-${exporter.credential}`, key: "AWS_ACCESS_KEY_ID" }
            }
          }]
          : [],
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
      }],
      volumes: [{
        name: "config",
        configMap: {
          name
        }
      }]
    };

    monitorEndpoints.push({
      interval: "30s",
      port: "metrics",
      path: "/metrics"
    });
  } else if (exporter.type == "stackdriver") {
    // We do not support changing the following envvars, because they are part of the integration:
    // - GOOGLE_APPLICATION_CREDENTIALS must be "/credential/secret.json"
    // - STACKDRIVER_EXPORTER_WEB_LISTEN_ADDRESS must be ":9255" (default)
    // - STACKDRIVER_EXPORTER_WEB_TELEMETRY_PATH must be "/metrics" (default)
    // To enforce this, we always set these envvars, and block the user from overriding them.
    const env: Array<V1EnvVar> = [];
    if (exporter.credential) {
      env.push({
        name: "GOOGLE_APPLICATION_CREDENTIALS",
        value: "/credential/secret.json",
      });
    }
    env.push({
      name: "STACKDRIVER_EXPORTER_WEB_LISTEN_ADDRESS",
      value: ":9255",
    });
    env.push({
      name: "STACKDRIVER_EXPORTER_WEB_TELEMETRY_PATH",
      value: "/metrics",
    });

    const bannedEnv = new Set<string>();
    env.forEach(e => bannedEnv.add(e.name));

    // For now we just pass through all configuration options as envvars.
    // However, changing some of thees options might cause problems.
    // For example we assume that the following are left with their defaults:
    Object.entries(JSON.parse(exporter.config)).forEach(([k, v]) => {
      // Env name: Add prefix, uppercase, and replace any punctuation with '_'
      // Example: google.project-id => STACKDRIVER_EXPORTER_GOOGLE_PROJECT_ID
      const name = "STACKDRIVER_EXPORTER_" + k.toUpperCase().replace(/\W/g, '_');
      if (bannedEnv.has(name)) {
        // Disallow user override of this env setting
        return;
      }
      // Env value: Original string as-is, or array converted to comma-separated string.
      const value = (v instanceof Array)
        ? v.toString() // convert array to comma-separated string (e.g. ["foo","bar"] => "foo,bar" without [])
        : v as string; // plain string conversion, but for arrays this would include the []
      env.push({ name, value });
    });

    podSpec = {
      containers: [{
        name: "exporter",
        image: DockerImages.exporterStackdriver,
        env,
        ports: [{ name: "metrics", containerPort: 9255 }],
        // Enable credential mount if credential is specified
        volumeMounts: (exporter.credential)
          ? [{ name: "credential", mountPath: "/credential" }]
          : [],
        // Use the root path, which just returns a stub HTML page
        // see https://github.com/prometheus-community/stackdriver_exporter/blob/42badeb/stackdriver_exporter.go#L178
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
      }],
      // Enable credential volume if credential is specified
      volumes: (exporter.credential)
        ? [{
          name: "credential",
          secret: {
            secretName: `credential-${exporter.credential}`,
          }
        }]
        : []
    };

    monitorEndpoints.push({
      interval: "30s",
      port: "metrics",
      path: "/metrics"
    });
  } else if (exporter.type == "azure") {
    resources.push(
      new ConfigMap(
        {
          apiVersion: "v1",
          kind: "ConfigMap",
          // Use name/labels that match the Deployment
          metadata: {
            name,
            namespace,
            labels
          },
          data: {
            // Convert JSON string to YAML string
            "azure.yml": yaml.dump(JSON.parse(exporter.config))
          }
        },
        kubeConfig
      )
    );

    podSpec = {
      containers: [{
        name: "exporter",
        image: DockerImages.exporterAzure,
        command: ["/bin/azure_metrics_exporter", "--config.file=/config/azure.yml"],
        env: (exporter.credential)
          ? [{
            name: "AZURE_SUBSCRIPTION_ID",
            valueFrom: {
              secretKeyRef: { name: `credential-${exporter.credential}`, key: "AZURE_SUBSCRIPTION_ID" }
            }
          }, {
            name: "AZURE_TENANT_ID",
            valueFrom: {
              secretKeyRef: { name: `credential-${exporter.credential}`, key: "AZURE_TENANT_ID" }
            }
          }, {
            name: "AZURE_CLIENT_ID",
            valueFrom: {
              secretKeyRef: { name: `credential-${exporter.credential}`, key: "AZURE_CLIENT_ID" }
            }
          }, {
            name: "AZURE_CLIENT_SECRET",
            valueFrom: {
              secretKeyRef: { name: `credential-${exporter.credential}`, key: "AZURE_CLIENT_SECRET" }
            }
          }]
          : [],
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
      }],
      volumes: [{
        name: "config",
        configMap: {
          name
        }
      }]
    };

    monitorEndpoints.push({
      interval: "30s",
      port: "metrics",
      path: "/metrics"
    });
  } else if (exporter.type == "blackbox") {
    const exporterConfig = JSON.parse(exporter.config) as BlackboxConfig;

    // modules: Override the default exporter module configuration yaml file (optional)
    if (exporterConfig.modules) {
      resources.push(
        new ConfigMap(
          {
            apiVersion: "v1",
            kind: "ConfigMap",
            // Use name/labels that match the Deployment
            metadata: {
              name,
              namespace,
              labels
            },
            data: {
              // Convert JSON string to YAML string.
              // Blackbox exporter expects a root-level 'modules' section.
              "config.yml": yaml.dump({modules: exporterConfig.modules})
            }
          },
          kubeConfig
        )
      );
    }

    // If modules is defined, configure configmap volume.
    // Line things up so that the config ends up at the default path of /etc/blackbox_exporter/config.yml
    podSpec = {
      containers: [{
        name: "exporter",
        image: DockerImages.exporterBlackbox,
        ports: [{ name: "metrics", containerPort: 9115 }],
        // Enable configmap mount if modules override is provided
        volumeMounts: (exporterConfig.modules)
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
      }],
      // Enable configmap mount if modules override is provided
      volumes: (exporterConfig.modules)
        ? [{ name: "config", configMap: { name }}]
        : [],
    };

    // probes: List of probes to run against exporter modules (required)
    // We need to configure Prometheus to hit each of the specified probes.
    // Add the probes to the ServiceMonitor object as HTTP /probe queries
    if (!exporterConfig.probes) {
      log.warning(
        "Skipping deployment of blackbox exporter %s/%s: missing required 'probes' in config",
        exporter.tenant,
        exporter.name
      );
      return [];
    }
    for (const probeIdx in exporterConfig.probes) {
      // Convert the object values to be arrays to match ServiceMonitor schema:
      //   {module: "http_2xx", target: "example.com"} => {module: ["http_2xx"], target: ["example.com"]}
      const params = Object.fromEntries(
        Object.entries(exporterConfig.probes[probeIdx])
          .map(([k,v]) => [k, [v]])
      );
      // Ensure that the per-probe metrics are each labeled with the probe info: module and target normally
      const relabelings = Object.entries(exporterConfig.probes[probeIdx])
        .map(([k, v]) => ({
          // Prometheus label hack: Pick an arbitrary label that should exist in the metric.
          // This value is ignored and results in inserting a new label.
          sourceLabels: ["job"],
          targetLabel: k,
          replacement: v,
        }));
      monitorEndpoints.push({
        interval: "30s",
        port: "metrics",
        path: "/probe",
        // HTTP GET params must be provided as separate object field, not as part of path:
        params,
        relabelings,
      });
    }
  } else {
    log.warning("Exporter %s/%s has unsupported type: %s", exporter.tenant, exporter.name, exporter.type);
    return [];
  }

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
            matchLabels: {
              app: name,
            }
          },
          template: {
            metadata: {
              labels
            },
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
        metadata: {
          name,
          namespace,
          labels
        },
        spec: {
          ports: [
            {
              name: "metrics",
              port: 9000,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: "metrics" as any
            }
          ],
          selector: {
            app: name
          }
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
          labels,
        },
        spec: {
          // Shows up as "job" label in metrics
          jobLabel: exporter.name,
          endpoints: monitorEndpoints,
          selector: {
            matchLabels: {
              app: name
            }
          }
        }
      },
      kubeConfig
    )
  );

  return resources;
};
