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
  Service,
  ServiceAccount,
  ClusterRole,
  ClusterRoleBinding,
  Deployment,
  RoleBinding,
  ApiService,
  ConfigMap
} from "@opstrace/kubernetes";
import { State } from "../../../reducer";
import { KubeConfig } from "@kubernetes/client-node";
import { DockerImages } from "@opstrace/controller-config";

export function PrometheusAdaptorResources(
  state: State,
  kubeConfig: KubeConfig,
  namespace: string
): ResourceCollection {
  const collection = new ResourceCollection();

  collection.add(
    new ConfigMap(
      {
        apiVersion: "v1",
        data: {
          "config.yaml":
            'resourceRules:\n  cpu:\n    containerQuery: sum(rate(container_cpu_usage_seconds_total{<<.LabelMatchers>>,container_name!="POD",container_name!="",pod_name!=""}[1m])) by (<<.GroupBy>>)\n    nodeQuery: sum(1 - rate(node_cpu_seconds_total{mode="idle"}[1m]) * on(namespace, pod) group_left(node) node_namespace_pod:kube_pod_info:{<<.LabelMatchers>>}) by (<<.GroupBy>>)\n    resources:\n      overrides:\n        node:\n          resource: node\n        namespace:\n          resource: namespace\n        pod_name:\n          resource: pod\n    containerLabel: container_name\n  memory:\n    containerQuery: sum(container_memory_working_set_bytes{<<.LabelMatchers>>,container_name!="POD",container_name!="",pod_name!=""}) by (<<.GroupBy>>)\n    nodeQuery: sum(node_memory_MemTotal_bytes{job="node-exporter",<<.LabelMatchers>>} - node_memory_MemAvailable_bytes{job="node-exporter",<<.LabelMatchers>>}) by (<<.GroupBy>>)\n    resources:\n      overrides:\n        instance:\n          resource: node\n        namespace:\n          resource: namespace\n        pod_name:\n          resource: pod\n    containerLabel: container_name\n  window: 1m\n'
        },
        kind: "ConfigMap",
        metadata: {
          name: "adapter-config",
          namespace
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
          name: "prometheus-adapter",
          namespace
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
          labels: {
            name: "prometheus-adapter"
          },
          name: "prometheus-adapter",
          namespace
        },
        spec: {
          ports: [
            {
              name: "https",
              port: 443,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: 6443 as any
            }
          ],
          selector: {
            name: "prometheus-adapter"
          }
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
          name: "prometheus-adapter",
          namespace
        },
        spec: {
          replicas: 1,
          selector: {
            matchLabels: {
              name: "prometheus-adapter"
            }
          },
          strategy: {
            rollingUpdate: {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              maxSurge: 1 as any,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              maxUnavailable: 0 as any
            }
          },
          template: {
            metadata: {
              labels: {
                name: "prometheus-adapter"
              }
            },
            spec: {
              containers: [
                {
                  args: [
                    "--cert-dir=/var/run/serving-cert",
                    "--config=/etc/adapter/config.yaml",
                    "--logtostderr=true",
                    "--metrics-relist-interval=1m",
                    `--prometheus-url=http://prometheus.${namespace}.svc:9090/`,
                    "--secure-port=6443"
                  ],
                  image: DockerImages.prometheusAdapter,
                  name: "prometheus-adapter",
                  ports: [
                    {
                      containerPort: 6443
                    }
                  ],
                  volumeMounts: [
                    {
                      mountPath: "/tmp",
                      name: "tmpfs",
                      readOnly: false
                    },
                    {
                      mountPath: "/var/run/serving-cert",
                      name: "volume-serving-cert",
                      readOnly: false
                    },
                    {
                      mountPath: "/etc/adapter",
                      name: "config",
                      readOnly: false
                    }
                  ]
                }
              ],
              nodeSelector: {
                "kubernetes.io/os": "linux"
              },
              serviceAccountName: "prometheus-adapter",
              volumes: [
                {
                  emptyDir: {},
                  name: "tmpfs"
                },
                {
                  emptyDir: {},
                  name: "volume-serving-cert"
                },
                {
                  configMap: {
                    name: "adapter-config"
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
    new ApiService(
      {
        apiVersion: "apiregistration.k8s.io/v1",
        kind: "APIService",
        metadata: {
          name: "v1beta1.metrics.k8s.io"
        },
        spec: {
          group: "metrics.k8s.io",
          groupPriorityMinimum: 100,
          insecureSkipTLSVerify: true,
          service: {
            name: "prometheus-adapter",
            namespace
          },
          version: "v1beta1",
          versionPriority: 100
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
          name: "prometheus-adapter"
        },
        rules: [
          {
            apiGroups: [""],
            resources: ["nodes", "namespaces", "pods", "services"],
            verbs: ["get", "list", "watch"]
          }
        ]
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
          labels: {
            "rbac.authorization.k8s.io/aggregate-to-admin": "true",
            "rbac.authorization.k8s.io/aggregate-to-edit": "true",
            "rbac.authorization.k8s.io/aggregate-to-view": "true"
          },
          name: "system:aggregated-metrics-reader"
        },
        rules: [
          {
            apiGroups: ["metrics.k8s.io"],
            resources: ["pods"],
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
          name: "prometheus-adapter"
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "ClusterRole",
          name: "prometheus-adapter"
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: "prometheus-adapter",
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
          name: "resource-metrics:system:auth-delegator"
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "ClusterRole",
          name: "system:auth-delegator"
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: "prometheus-adapter",
            namespace
          }
        ]
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
          name: "resource-metrics-server-resources"
        },
        rules: [
          {
            apiGroups: ["metrics.k8s.io"],
            resources: ["*"],
            verbs: ["*"]
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
          name: "resource-metrics-auth-reader",
          namespace: "kube-system"
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "Role",
          name: "extension-apiserver-authentication-reader"
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: "prometheus-adapter",
            namespace
          }
        ]
      },
      kubeConfig
    )
  );

  return collection;
}
