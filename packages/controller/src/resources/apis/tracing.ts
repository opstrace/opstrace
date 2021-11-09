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
import {
  ResourceCollection,
  ConfigMap,
  Deployment,
  Service,
  V1ServicemonitorResource,
  withPodAntiAffinityRequired
} from "@opstrace/kubernetes";
import { State } from "../../reducer";
import { Tenant } from "@opstrace/tenants";
import { KubeConfig, V1EnvVar } from "@kubernetes/client-node";
import {
  getControllerConfig,
  getNodeCount,
  getTenantNamespace
} from "../../helpers";
import { addTracingApiIngress } from "./ingress";
import { nodecountToReplicacount } from "./index";
import {
  DockerImages,
  LatestControllerConfigType,
  getImagePullSecrets
} from "@opstrace/controller-config";

export function TracingAPIResources(
  state: State,
  tenant: Tenant,
  kubeConfig: KubeConfig
): ResourceCollection {
  const collection = new ResourceCollection();

  const controllerConfig: LatestControllerConfigType =
    getControllerConfig(state);

  const namespace = getTenantNamespace(tenant);

  // This was 'prometheus' before, see epic opstrace-prelaunch/issues/1609
  const api = "tracing";
  const name = `${api}-api`;

  let tracingApiEnv: V1EnvVar[];
  let configReceiversAuth: Record<string, unknown>;
  let configExtensions: Record<string, unknown>;
  let configExtensionNames: string[];
  if (controllerConfig.disable_data_api_authentication) {
    tracingApiEnv = [];

    configReceiversAuth = {};
    configExtensions = {};
    configExtensionNames = [];
  } else {
    tracingApiEnv = [
      {
        name: "API_AUTHTOKEN_VERIFICATION_PUBKEY_SET",
        value: controllerConfig.tenant_api_authenticator_pubkey_set_json
      }
    ];
    const dataApiAuthnPubkeyPem =
      controllerConfig.data_api_authn_pubkey_pem ?? "";
    if (dataApiAuthnPubkeyPem !== "") {
      tracingApiEnv.push({
        name: "API_AUTHTOKEN_VERIFICATION_PUBKEY",
        value: dataApiAuthnPubkeyPem
      });
    }

    configReceiversAuth = {
      authenticator: "opstraceauth"
    };
    configExtensions = {
      opstraceauth: {
        tenantName: tenant.name
      }
    };
    configExtensionNames = ["opstraceauth"];
  }

  const config = {
    receivers: {
      otlp: {
        protocols: {
          grpc: {
            endpoint: ":4317",
            auth: configReceiversAuth
          }
        }
      }
    },
    exporters: {
      jaeger: {
        // TODO: could instead use jaeger-collector-headless?
        endpoint: `http://jaeger-collector.${namespace}.svc.cluster.local:14250`,
        tls: {
          insecure: true
        }
      },
      // TODO(nickbp): remove after testing that tracing works E2E
      logging: {
        logLevel: "debug"
      }
    },
    extensions: configExtensions,
    service: {
      extensions: configExtensionNames,
      pipelines: {
        traces: {
          receivers: ["otlp"],
          processors: [],
          exporters: ["jaeger", "logging"]
        }
      }
    }
  };

  collection.add(
    new ConfigMap(
      {
        apiVersion: "v1",
        kind: "ConfigMap",
        metadata: {
          name,
          namespace,
          labels: {
            "k8s-app": name
          }
        },
        data: {
          "config.yaml": yaml.safeDump(config)
        }
      },
      kubeConfig
    )
  );

  collection.add(
    new Deployment(
      {
        apiVersion: "apps/v1",
        kind: "Deployment",
        metadata: {
          name: name,
          namespace,
          labels: {
            "k8s-app": name
          }
        },
        spec: {
          replicas: nodecountToReplicacount(getNodeCount(state)),
          selector: {
            matchLabels: {
              "k8s-app": name
            }
          },
          template: {
            metadata: {
              labels: {
                "k8s-app": name
              }
            },
            spec: {
              affinity: withPodAntiAffinityRequired({
                "k8s-app": name
              }),
              imagePullSecrets: getImagePullSecrets(),
              containers: [
                {
                  name,
                  image: DockerImages.tracingApi,
                  imagePullPolicy: "IfNotPresent",
                  args: ["--config=/etc/collector/config.yaml"],
                  env: tracingApiEnv,
                  ports: [
                    {
                      name: "otlp-grpc",
                      protocol: "TCP",
                      containerPort: 4317
                    },
                    {
                      name: "metrics",
                      protocol: "TCP",
                      containerPort: 8888
                    }
                  ],
                  readinessProbe: {
                    httpGet: {
                      path: "/metrics",
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      port: "metrics" as any,
                      scheme: "HTTP"
                    },
                    timeoutSeconds: 1,
                    periodSeconds: 10,
                    successThreshold: 1,
                    failureThreshold: 3
                  },
                  volumeMounts: [
                    {
                      mountPath: "/etc/collector",
                      name: "config"
                    }
                  ]
                }
              ],
              volumes: [
                {
                  configMap: {
                    name
                  },
                  name: "config"
                }
              ]
            }
          }
        }
      },
      kubeConfig
    )
  );

  collection.add(
    new Service(
      {
        apiVersion: "v1",
        kind: "Service",
        metadata: {
          name,
          labels: {
            "k8s-app": name,
            job: `${namespace}.${name}`
          },
          namespace
        },
        spec: {
          ports: [
            {
              name: "otlp-grpc",
              port: 4317,
              protocol: "TCP",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: "otlp-grpc" as any
            },
            {
              name: "metrics",
              port: 8888,
              protocol: "TCP",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: "metrics" as any
            }
          ],
          selector: {
            "k8s-app": name
          }
        }
      },
      kubeConfig
    )
  );

  addTracingApiIngress({
    serviceName: name,
    issuer: controllerConfig.tlsCertificateIssuer,
    namespace,
    tenant,
    api,
    state,
    collection,
    kubeConfig
  });

  collection.add(
    new V1ServicemonitorResource(
      {
        apiVersion: "monitoring.coreos.com/v1",
        kind: "ServiceMonitor",
        metadata: {
          labels: {
            "k8s-app": name,
            tenant: "system"
          },
          name,
          namespace
        },
        spec: {
          endpoints: [
            {
              interval: "30s",
              path: "/metrics",
              port: "metrics"
            }
          ],
          jobLabel: "job",
          namespaceSelector: {
            matchNames: [namespace]
          },
          selector: {
            matchLabels: {
              "k8s-app": name
            }
          }
        }
      },
      kubeConfig
    )
  );

  return collection;
}
