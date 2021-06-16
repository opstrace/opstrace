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

import { KubeConfig } from "@kubernetes/client-node";
import {
  ResourceCollection,
  ConfigMap,
  ServiceAccount,
  ClusterRole,
  Role,
  RoleBinding,
  ClusterRoleBinding,
  V1ServicemonitorResource,
  DaemonSet,
  Service,
  getLoadBalancerAnnotations
} from "@opstrace/kubernetes";
import { State } from "../../reducer";
import { entries } from "@opstrace/utils";
import { getDomain, getControllerConfig } from "../../helpers";
import { DockerImages, getImagePullSecrets } from "@opstrace/controller-config";

export function NginxIngressResources(
  state: State,
  kubeConfig: KubeConfig,
  namespace: string
): ResourceCollection {
  const collection = new ResourceCollection();

  const domain = getDomain(state);

  const {
    target,
    uiSourceIpFirewallRules,
    apiSourceIpFirewallRules
  } = getControllerConfig(state);
  const ports: {
    ui: { public: boolean; http: number; https: number };
    api: { public: boolean; http: number; https: number };
  } = {
    ui: {
      public: true,
      http: 80,
      https: 443
    },
    api: {
      public: true,
      http: 80,
      https: 443
    }
  };

  entries({
    ui: uiSourceIpFirewallRules,
    api: apiSourceIpFirewallRules
  }).forEach(([endpointName, sourceIps]) => {
    const endpointConfig = ports[endpointName];

    let extraSVCLoadBalancerAnnotations = {};
    if (endpointName === "ui") {
      extraSVCLoadBalancerAnnotations = {
        "external-dns.alpha.kubernetes.io/hostname": `${domain}`
      };
    }

    collection.add(
      new Service(
        {
          kind: "Service",
          apiVersion: "v1",
          metadata: {
            name: `nginx-ingress-controller-${endpointName}`,
            namespace,
            labels: {
              "app.kubernetes.io/name": `ingress-nginx-${endpointName}`,
              "app.kubernetes.io/part-of": "ingress-nginx"
            },
            annotations: {
              "external-dns.alpha.kubernetes.io/ttl": "30",
              ...extraSVCLoadBalancerAnnotations,
              ...getLoadBalancerAnnotations({
                isPublic: endpointConfig.public,
                platform: target
              })
            }
          },
          spec: {
            type: "LoadBalancer",
            loadBalancerSourceRanges: sourceIps,
            selector: {
              "app.kubernetes.io/name": `ingress-nginx-${endpointName}`
            },
            ports: [
              {
                name: "http",
                port: endpointConfig.http,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                targetPort: "http" as any
              },
              {
                name: "https",
                port: endpointConfig.https,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                targetPort: "https" as any
              }
            ]
          }
        },
        kubeConfig
      )
    );

    collection.add(
      new DaemonSet(
        {
          apiVersion: "apps/v1",
          kind: "DaemonSet",
          metadata: {
            name: `nginx-ingress-controller-${endpointName}`,
            namespace,
            labels: {
              "app.kubernetes.io/name": `ingress-nginx-${endpointName}`
            }
          },
          spec: {
            selector: {
              matchLabels: {
                "app.kubernetes.io/name": `ingress-nginx-${endpointName}`
              }
            },
            template: {
              metadata: {
                labels: {
                  "app.kubernetes.io/name": `ingress-nginx-${endpointName}`
                }
              },
              spec: {
                imagePullSecrets: getImagePullSecrets(),
                terminationGracePeriodSeconds: 300,
                serviceAccountName: "nginx-ingress-serviceaccount",
                containers: [
                  {
                    name: "nginx-ingress-controller",
                    image: DockerImages.nginxController,
                    args: [
                      "/nginx-ingress-controller",
                      `--election-id=ingress-controller-leader-${endpointName}`,
                      `--configmap=$(POD_NAMESPACE)/nginx-configuration-${endpointName}`,
                      `--publish-service=$(POD_NAMESPACE)/nginx-ingress-controller-${endpointName}`,
                      "--annotations-prefix=nginx.ingress.kubernetes.io",
                      `--ingress-class=${endpointName}`,
                      `--http-port=${endpointConfig.http}`,
                      `--https-port=${endpointConfig.https}`
                    ],
                    securityContext: {
                      allowPrivilegeEscalation: true,
                      capabilities: {
                        drop: ["ALL"],
                        add: ["NET_BIND_SERVICE"]
                      },
                      runAsUser: 101
                    },
                    env: [
                      {
                        name: "POD_NAME",
                        valueFrom: {
                          fieldRef: {
                            fieldPath: "metadata.name"
                          }
                        }
                      },
                      {
                        name: "POD_NAMESPACE",
                        valueFrom: {
                          fieldRef: {
                            fieldPath: "metadata.namespace"
                          }
                        }
                      }
                    ],
                    ports: [
                      {
                        name: "http",
                        containerPort: endpointConfig.http
                      },
                      {
                        name: "https",
                        containerPort: endpointConfig.https
                      }
                    ],
                    resources: {
                      limits: {
                        cpu: "500m"
                      }
                    },
                    livenessProbe: {
                      failureThreshold: 3,
                      httpGet: {
                        path: "/healthz",
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        port: 10254 as any,
                        scheme: "HTTP"
                      },
                      initialDelaySeconds: 10,
                      periodSeconds: 10,
                      successThreshold: 1,
                      timeoutSeconds: 10
                    },
                    readinessProbe: {
                      failureThreshold: 3,
                      httpGet: {
                        path: "/healthz",
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        port: 10254 as any,
                        scheme: "HTTP"
                      },
                      periodSeconds: 10,
                      successThreshold: 1,
                      timeoutSeconds: 10
                    },
                    lifecycle: {
                      preStop: {
                        exec: {
                          command: ["/wait-shutdown"]
                        }
                      }
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

    collection.add(
      new ConfigMap(
        {
          kind: "ConfigMap",
          apiVersion: "v1",
          metadata: {
            name: `nginx-configuration-${endpointName}`,
            namespace,
            labels: {
              "app.kubernetes.io/name": `ingress-nginx-${endpointName}`
            }
          },
          data: {
            "keep-alive": "3700" // This is 100 seconds longer than the Loadbalancer
          }
        },
        kubeConfig
      )
    );

    collection.add(
      new Service(
        {
          kind: "Service",
          apiVersion: "v1",
          metadata: {
            name: `nginx-ingress-metrics-${endpointName}`,
            namespace,
            labels: {
              service: "nginx-ingress-metrics",
              "app.kubernetes.io/name": `ingress-nginx-${endpointName}`
            }
          },
          spec: {
            selector: {
              "app.kubernetes.io/name": `ingress-nginx-${endpointName}`
            },
            ports: [
              {
                name: "metrics",
                port: 10254
              }
            ]
          }
        },
        kubeConfig
      )
    );
  });

  collection.add(
    new ServiceAccount(
      {
        apiVersion: "v1",
        kind: "ServiceAccount",
        metadata: {
          name: "nginx-ingress-serviceaccount",
          namespace,
          labels: {
            "app.kubernetes.io/name": "ingress-nginx",
            "app.kubernetes.io/part-of": "ingress-nginx"
          }
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
          name: "nginx-ingress-clusterrole",
          labels: {
            "app.kubernetes.io/name": "ingress-nginx",
            "app.kubernetes.io/part-of": "ingress-nginx"
          }
        },
        rules: [
          {
            apiGroups: [""],
            resources: ["configmaps", "endpoints", "nodes", "pods", "secrets"],
            verbs: ["list", "watch"]
          },
          {
            apiGroups: [""],
            resources: ["nodes"],
            verbs: ["get"]
          },
          {
            apiGroups: [""],
            resources: ["services"],
            verbs: ["get", "list", "watch"]
          },
          {
            apiGroups: [""],
            resources: ["events"],
            verbs: ["create", "patch"]
          },
          {
            apiGroups: ["extensions", "networking.k8s.io"],
            resources: ["ingresses"],
            verbs: ["get", "list", "watch"]
          },
          {
            apiGroups: ["extensions", "networking.k8s.io"],
            resources: ["ingresses/status"],
            verbs: ["update"]
          }
        ]
      },
      kubeConfig
    )
  );

  collection.add(
    new Role(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "Role",
        metadata: {
          name: "nginx-ingress-role",
          namespace,
          labels: {
            "app.kubernetes.io/name": "ingress-nginx",
            "app.kubernetes.io/part-of": "ingress-nginx"
          }
        },
        rules: [
          {
            apiGroups: [""],
            resources: ["configmaps", "pods", "secrets", "namespaces"],
            verbs: ["get"]
          },
          {
            apiGroups: [""],
            resources: ["configmaps"],
            resourceNames: [
              "ingress-controller-leader-api-api",
              "ingress-controller-leader-ui-ui"
            ],
            verbs: ["get", "update"]
          },
          {
            apiGroups: [""],
            resources: ["configmaps"],
            verbs: ["create"]
          },
          {
            apiGroups: [""],
            resources: ["endpoints"],
            verbs: ["get"]
          }
        ]
      },
      kubeConfig
    )
  );
  collection.add(
    new RoleBinding(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "RoleBinding",
        metadata: {
          name: "nginx-ingress-role-nisa-binding",
          namespace,
          labels: {
            "app.kubernetes.io/name": "ingress-nginx",
            "app.kubernetes.io/part-of": "ingress-nginx"
          }
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "Role",
          name: "nginx-ingress-role"
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: "nginx-ingress-serviceaccount",
            namespace
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
          name: "nginx-ingress-clusterrole-nisa-binding",
          labels: {
            "app.kubernetes.io/name": "ingress-nginx",
            "app.kubernetes.io/part-of": "ingress-nginx"
          }
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "ClusterRole",
          name: "nginx-ingress-clusterrole"
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: "nginx-ingress-serviceaccount",
            namespace
          }
        ]
      },
      kubeConfig
    )
  );
  collection.add(
    new V1ServicemonitorResource(
      {
        apiVersion: "monitoring.coreos.com/v1",
        kind: "ServiceMonitor",
        metadata: {
          name: "nginx-ingress-controller-metrics",
          namespace,
          labels: {
            "app.kubernetes.io/name": "ingress-nginx",
            tenant: "system"
          }
        },
        spec: {
          endpoints: [
            {
              interval: "30s",
              port: "metrics"
            }
          ],
          selector: {
            matchLabels: {
              service: "nginx-ingress-metrics"
            }
          }
        }
      },
      kubeConfig
    )
  );

  return collection;
}
