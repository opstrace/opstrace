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

import { KubeConfig } from "@kubernetes/client-node";
import {
  ClusterRole,
  ClusterRoleBinding,
  Deployment,
  ResourceCollection,
  Service,
  ServiceAccount,
  Secret,
  V1ServicemonitorResource
} from "@opstrace/kubernetes";
import { generateSecretValue } from "../../helpers";
import { DockerImages, getImagePullSecrets } from "@opstrace/controller-config";

export function JaegerOperatorResources(
  kubeConfig: KubeConfig,
  namespace: string
): ResourceCollection {
  const collection = new ResourceCollection();

  const jaegerPasswordSecret = new Secret(
    {
      apiVersion: "v1",
      kind: "Secret",
      metadata: {
        name: "jaeger-operator-password",
        namespace
      },
      data: {
        username: "jaeger_operator",
        password: Buffer.from(generateSecretValue()).toString("base64")
      }
    },
    kubeConfig
  );
  // We don't want this value to change once it exists.
  // The value of this secret can always be updated manually in the cluster if needs be (kubectl delete <name> -n application) and the controller will create a new one.
  jaegerPasswordSecret.setImmutable();
  collection.add(jaegerPasswordSecret);

  collection.add(
    new ServiceAccount(
      {
        apiVersion: "v1",
        kind: "ServiceAccount",
        metadata: {
          name: "jaeger-operator",
          namespace
        }
      },
      kubeConfig
    )
  );

  // cluster_role, cluster_role_binding, operator

  collection.add(
    new ClusterRole(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "ClusterRole",
        metadata: {
          name: "jaeger-operator"
        },
        rules: [
          {
            apiGroups: [""],
            resources: ["configmaps", "services"],
            verbs: [
              "create",
              "delete",
              "get",
              "patch",
              "update",
              "list",
              "watch"
            ]
          },

          // our own custom resources
          {
            apiGroups: ["jaegertracing.io"],
            resources: ["*"],
            verbs: [
              "create",
              "delete",
              "get",
              "list",
              "patch",
              "update",
              "watch"
            ]
          },
          // for the operator's own deployment
          {
            apiGroups: ["apps"],
            resourceNames: ["jaeger-operator"],
            resources: ["deployments/finalizers"],
            verbs: ["update"]
          },
          // regular things the operator manages for an instance, as the result of processing CRs
          {
            apiGroups: [""],
            resources: [
              "configmaps",
              "persistentvolumeclaims",
              "pods",
              "secrets",
              "serviceaccounts",
              "services",
              "services/finalizers"
            ],
            verbs: [
              "create",
              "delete",
              "get",
              "list",
              "patch",
              "update",
              "watch"
            ]
          },
          {
            apiGroups: ["apps"],
            resources: [
              "deployments",
              "daemonsets",
              "replicasets",
              "statefulsets"
            ],
            verbs: [
              "create",
              "delete",
              "get",
              "list",
              "patch",
              "update",
              "watch"
            ]
          },
          {
            apiGroups: ["extensions"],
            resources: ["ingresses"],
            verbs: [
              "create",
              "delete",
              "get",
              "list",
              "patch",
              "update",
              "watch"
            ]
          },
          // Ingress for kubernetes 1.14 or higher
          {
            apiGroups: ["networking.k8s.io"],
            resources: ["ingresses"],
            verbs: [
              "create",
              "delete",
              "get",
              "list",
              "patch",
              "update",
              "watch"
            ]
          },
          {
            apiGroups: ["batch"],
            resources: ["jobs", "cronjobs"],
            verbs: [
              "create",
              "delete",
              "get",
              "list",
              "patch",
              "update",
              "watch"
            ]
          },
          {
            apiGroups: ["route.openshift.io"],
            resources: ["routes"],
            verbs: [
              "create",
              "delete",
              "get",
              "list",
              "patch",
              "update",
              "watch"
            ]
          },
          {
            apiGroups: ["console.openshift.io"],
            resources: ["consolelinks"],
            verbs: [
              "create",
              "delete",
              "get",
              "list",
              "patch",
              "update",
              "watch"
            ]
          },
          {
            apiGroups: ["autoscaling"],
            resources: ["horizontalpodautoscalers"],
            verbs: [
              "create",
              "delete",
              "get",
              "list",
              "patch",
              "update",
              "watch"
            ]
          },
          // needed if you want the operator to create service monitors for the Jaeger instances
          {
            apiGroups: ["monitoring.coreos.com"],
            resources: ["servicemonitors"],
            verbs: [
              "create",
              "delete",
              "get",
              "list",
              "patch",
              "update",
              "watch"
            ]
          },
          // for the Elasticsearch auto-provisioning
          {
            apiGroups: ["logging.openshift.io"],
            resources: ["elasticsearches"],
            verbs: [
              "create",
              "delete",
              "get",
              "list",
              "patch",
              "update",
              "watch"
            ]
          },
          // for the Kafka auto-provisioning
          {
            apiGroups: ["kafka.strimzi.io"],
            resources: ["kafkas", "kafkausers"],
            verbs: [
              "create",
              "delete",
              "get",
              "list",
              "patch",
              "update",
              "watch"
            ]
          },

          // Extra permissions
          // This is an extra set of permissions that the Jaeger Operator might make use of if granted

          // needed if support for injecting sidecars based on namespace annotation is required
          {
            apiGroups: [""],
            resources: ["namespaces"],
            verbs: ["get", "list", "watch"]
          },
          // needed if support for injecting sidecars based on deployment annotation is required, across all namespaces
          {
            apiGroups: ["apps"],
            resources: ["deployments"],
            verbs: ["get", "list", "patch", "update", "watch"]
          },
          // needed only when .Spec.Ingress.Openshift.DelegateUrls is used
          {
            apiGroups: ["rbac.authorization.k8s.io"],
            resources: ["clusterrolebindings"],
            verbs: [
              "create",
              "delete",
              "get",
              "list",
              "patch",
              "update",
              "watch"
            ]
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
          name: `jaeger-operator`
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: "jaeger-operator",
            namespace
          }
        ],
        roleRef: {
          kind: "ClusterRole",
          name: "jaeger-operator",
          apiGroup: "rbac.authorization.k8s.io"
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
          name: "jaeger-operator",
          namespace
        },
        spec: {
          selector: {
            matchLabels: {
              name: "jaeger-operator"
            }
          },
          replicas: 1,
          template: {
            metadata: {
              labels: {
                name: "jaeger-operator"
              }
            },
            spec: {
              serviceAccountName: "jaeger-operator",
              containers: [
                {
                  name: "jaeger-operator",
                  image: DockerImages.jaegerOperator,
                  ports: [
                    {
                      containerPort: 8383,
                      name: "http-metrics"
                    },
                    {
                      containerPort: 8686,
                      name: "cr-metrics"
                    }
                  ],
                  args: ["start"],
                  resources: {
                    limits: {
                      cpu: "500m",
                      memory: "512Mi"
                    },
                    requests: {
                      cpu: "100m",
                      memory: "128Mi"
                    }
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
                    },
                    {
                      name: "OPERATOR_NAME",
                      value: "jaeger-operator"
                    }
                  ]
                }
              ],
              imagePullSecrets: getImagePullSecrets()
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
          name: "clickhouse-operator",
          namespace,
          labels: {
            app: "clickhouse-operator"
          }
        },
        spec: {
          ports: [
            {
              name: "http-metrics",
              port: 8383,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: "http-metrics" as any
            },
            {
              name: "cr-metrics",
              port: 8686,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: "cr-metrics" as any
            }
          ],
          selector: {
            app: "clickhouse-operator"
          }
        }
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
          name: "clickhouse-operator",
          namespace,
          labels: {
            app: "clickhouse-operator"
          }
        },
        spec: {
          endpoints: [
            {
              interval: "30s",
              port: "http-metrics",
              path: "/metrics"
            },
            {
              interval: "30s",
              port: "cr-metrics",
              path: "/metrics"
            }
          ],
          jobLabel: "job",
          namespaceSelector: {
            matchNames: [namespace]
          },
          selector: {
            matchLabels: {
              app: "clickhouse-operator"
            }
          }
        }
      },
      kubeConfig
    )
  );

  return collection;
}
