/**
 * Copyright 2020 Opstrace, Inc.
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
  ResourceCollection,
  ServiceAccount,
  ClusterRole,
  ClusterRoleBinding,
  V1ServicemonitorResource,
  Service,
  Deployment,
  withPodAntiAffinityRequired
} from "@opstrace/kubernetes";
import { State } from "../../reducer";
import { Tenant } from "@opstrace/tenants";
import { KubeConfig, V1EnvVar } from "@kubernetes/client-node";
import {
  getNodeCount,
  getControllerConfig,
  getTenantNamespace
} from "../../helpers";
import { nodecountToReplicacount } from "./index";
import { addApiIngress } from "./ingress";
import {
  DockerImages,
  ControllerConfigType
} from "@opstrace/controller-config";

export function LokiAPIResources(
  state: State,
  tenant: Tenant,
  kubeConfig: KubeConfig
): ResourceCollection {
  const collection = new ResourceCollection();

  const config = {
    replicas: nodecountToReplicacount(getNodeCount(state)),
    resources: {}
  };

  const controllerConfig: ControllerConfigType = getControllerConfig(state);

  const namespace = getTenantNamespace(tenant);
  const api = "loki";
  const name = `${api}-api`;
  const lokiQuerierUrl = "http://querier.loki.svc.cluster.local:1080";
  const lokiDistributorUrl = "http://distributor.loki.svc.cluster.local:1080";

  const lokiApiProxyCliArgs = [
    "-listen=:8080",
    `-tenantname=${tenant.name}`,
    // Upstream endpoints for the opstrace loki proxy
    `-loki-querier-url=${lokiQuerierUrl}`,
    `-loki-distributor-url=${lokiDistributorUrl}`
  ];

  let lokiApiProxyEnv: V1EnvVar[];
  if (!controllerConfig.disable_data_api_authentication) {
    lokiApiProxyEnv = [
      {
        name: "API_AUTHTOKEN_VERIFICATION_PUBKEY",
        value: controllerConfig.data_api_authn_pubkey_pem
      }
    ];
  } else {
    lokiApiProxyEnv = [];
    lokiApiProxyCliArgs.push("-disable-api-authn");
  }

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
          replicas: config.replicas,
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
              containers: [
                {
                  name: "loki-api",
                  image: DockerImages.lokiApiProxy,
                  imagePullPolicy: "Always",
                  args: lokiApiProxyCliArgs,
                  ports: [
                    {
                      name: "http",
                      protocol: "TCP",
                      containerPort: 8080
                    }
                  ],
                  readinessProbe: {
                    httpGet: {
                      path: "/metrics",
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      port: 8080 as any,
                      scheme: "HTTP"
                    },
                    timeoutSeconds: 1,
                    periodSeconds: 10,
                    successThreshold: 1,
                    failureThreshold: 3
                  },
                  livenessProbe: {
                    httpGet: {
                      path: "/metrics",
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      port: 8080 as any,
                      scheme: "HTTP"
                    },
                    timeoutSeconds: 1,
                    periodSeconds: 10,
                    successThreshold: 1,
                    failureThreshold: 3
                  },
                  resources: config.resources,
                  env: lokiApiProxyEnv
                }
              ],
              serviceAccountName: name
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
            job: `${namespace}.loki-api`
          },
          namespace
        },
        spec: {
          ports: [
            {
              name: "http",
              port: 8080,
              protocol: "TCP",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: 8080 as any
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

  addApiIngress({
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
              port: "http"
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

  collection.add(
    new ServiceAccount(
      {
        apiVersion: "v1",
        kind: "ServiceAccount",
        metadata: {
          name: name,
          namespace
        }
      },
      kubeConfig
    )
  );

  collection.add(
    new ClusterRole(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "ClusterRole",
        metadata: {
          name: name
        },
        rules: [
          {
            apiGroups: [""],
            resources: ["namespaces", "pods"],
            verbs: ["get", "list", "watch"]
          }
        ]
      },
      kubeConfig
    )
  );

  collection.add(
    new ClusterRoleBinding(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "ClusterRoleBinding",
        metadata: {
          name: name
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "ClusterRole",
          name: name
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: name,
            namespace
          }
        ]
      },
      kubeConfig
    )
  );

  return collection;
}
