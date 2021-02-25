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
  if (exporter.type == "cloudwatch") {
    // TODO: The exporter pod is NOT automatically restarted if this ConfigMap changes.
    // Will want to ensure that the pod is restarted if this ConfigMap is updated.
    // See e.g. https://github.com/jimmidyson/configmap-reload/
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
      },{
        name: "config-watcher",
        image: DockerImages.exporterCloudwatch,
        env: [{
          name: "WATCH_FILE",
          value: "/config/config.yml"
        },{
          name: "WATCH_POLL_DELAY_SECS",
          value: "60"
        }],
        // When the ConfigMap is updated, the config volume should get updated automatically after a minute or two,
        // but there's nothing to ensure that the exporter process sees the new config.
        // As a workaround, we have this bash sidecar that polls for the config to change, then exits to restart the pod.
        // See also: https://github.com/jimmidyson/configmap-reload (but our exporter doesn't listen to webhooks)
        command: [
          "/bin/bash",
          "-c",
          "ORIG_SHA=\"$(sha256sum $WATCH_FILE)\"\n\
while [ \"$(sha256sum $WATCH_FILE)\" = \"$ORIG_SHA\" ]; do\n\
    echo \"$(date +%Y-%m-%d/%H:%M:%S) No change to $WATCH_FILE\"\n\
    sleep $WATCH_POLL_DELAY_SECS\n\
done\n\
echo \"$(date +%Y-%m-%d/%H:%M:%S) $WATCH_FILE SHA has changed, exiting\""
        ],
        volumeMounts: [{ name: "config", mountPath: "/config" }],
      }],
      volumes: [{
        name: "config",
        configMap: {
          name
        }
      }]
    };
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
        volumeMounts: [{ name: "credential", mountPath: "/credential" }]
      }],
      volumes: (exporter.credential)
        ? [{
          name: "credential",
          secret: {
            secretName: `credential-${exporter.credential}`,
          }
        }]
        : []
    };
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
          endpoints: [
            {
              interval: "30s",
              port: "metrics",
              // Common default path for both the cloudwatch and stackdriver exporters
              path: "/metrics"
            }
          ],
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
