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
import { addApiIngress } from "./ingress";
import { nodecountToReplicacount } from "./index";
import {
  DockerImages,
  LatestControllerConfigType,
  getImagePullSecrets
} from "@opstrace/controller-config";

export function DDAPIResources(
  state: State,
  tenant: Tenant,
  kubeConfig: KubeConfig
): ResourceCollection {
  const collection = new ResourceCollection();

  // Do not deploy DD API for system tenant.
  if (tenant.type === "SYSTEM") {
    return collection;
  }

  const config = {
    replicas: nodecountToReplicacount(getNodeCount(state)),
    resources: {}
  };

  const controllerConfig: LatestControllerConfigType = getControllerConfig(
    state
  );

  const namespace = getTenantNamespace(tenant);
  const apiName = "dd";
  const deplName = `${apiName}-api`;
  const remoteWriteURL =
    "http://distributor.cortex.svc.cluster.local/api/v1/push";

  const ddApiCliArgs = [
    "-listen=:8080",
    `-tenantname=${tenant.name}`,
    `-prom-remote-write-url=${remoteWriteURL}`
  ];

  let ddApiEnv: V1EnvVar[];

  if (controllerConfig.disable_data_api_authentication) {
    ddApiEnv = [];
    ddApiCliArgs.push("-disable-api-authn");
  } else {
    ddApiEnv = [
      {
        name: "API_AUTHTOKEN_VERIFICATION_PUBKEY_SET",
        value: controllerConfig.tenant_api_authenticator_pubkey_set_json
      }
    ];

    const data_api_authn_pubkey_pem =
      controllerConfig.data_api_authn_pubkey_pem ?? "";
    if (data_api_authn_pubkey_pem !== "") {
      ddApiEnv.push({
        name: "API_AUTHTOKEN_VERIFICATION_PUBKEY",
        value: data_api_authn_pubkey_pem
      });
    }
  }

  collection.add(
    new Deployment(
      {
        apiVersion: "apps/v1",
        kind: "Deployment",
        metadata: {
          name: deplName,
          namespace,
          labels: {
            "k8s-app": deplName
          }
        },
        spec: {
          replicas: config.replicas,
          selector: {
            matchLabels: {
              "k8s-app": deplName
            }
          },
          template: {
            metadata: {
              labels: {
                "k8s-app": deplName
              }
            },
            spec: {
              imagePullSecrets: getImagePullSecrets(),
              affinity: withPodAntiAffinityRequired({
                "k8s-app": deplName
              }),
              containers: [
                {
                  name: "dd-api",
                  image: DockerImages.ddApi,
                  imagePullPolicy: "Always",
                  args: ddApiCliArgs,
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
                  env: ddApiEnv
                }
              ],
              serviceAccountName: deplName
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
          name: deplName,
          labels: {
            "k8s-app": deplName,
            job: `${namespace}.dd-api`
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
            "k8s-app": deplName
          }
        }
      },
      kubeConfig
    )
  );

  addApiIngress({
    serviceName: deplName,
    issuer: controllerConfig.tlsCertificateIssuer,
    namespace,
    tenant,
    api: apiName,
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
            "k8s-app": deplName,
            tenant: "system"
          },
          name: deplName,
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
              "k8s-app": deplName
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
          name: deplName,
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
          name: deplName
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
          name: deplName
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "ClusterRole",
          name: deplName
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: deplName,
            namespace
          }
        ]
      },
      kubeConfig
    )
  );

  return collection;
}
