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
  Role,
  RoleBinding,
  V1ServicemonitorResource
} from "@opstrace/kubernetes";
import { State } from "../../../reducer";
import { KubeConfig } from "@kubernetes/client-node";
import { DockerImages } from "@opstrace/controller-config";

export function KubeStateMetricsResources(
  state: State,
  kubeConfig: KubeConfig,
  namespace: string
): ResourceCollection {
  const collection = new ResourceCollection();

  collection.add(
    new V1ServicemonitorResource(
      {
        apiVersion: "monitoring.coreos.com/v1",
        kind: "ServiceMonitor",
        metadata: {
          labels: {
            "k8s-app": "kube-state-metrics",
            tenant: "system"
          },
          name: "kube-state-metrics",
          namespace
        },
        spec: {
          endpoints: [
            {
              bearerTokenFile:
                "/var/run/secrets/kubernetes.io/serviceaccount/token",
              honorLabels: true,
              interval: "30s",
              port: "https-main",
              scheme: "https",
              scrapeTimeout: "30s",
              tlsConfig: {
                insecureSkipVerify: true
              }
            },
            {
              bearerTokenFile:
                "/var/run/secrets/kubernetes.io/serviceaccount/token",
              interval: "30s",
              port: "https-self",
              scheme: "https",
              tlsConfig: {
                insecureSkipVerify: true
              }
            }
          ],
          jobLabel: "k8s-app",
          selector: {
            matchLabels: {
              "k8s-app": "kube-state-metrics"
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
          name: "kube-state-metrics",
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
            "k8s-app": "kube-state-metrics"
          },
          name: "kube-state-metrics",
          namespace
        },
        spec: {
          clusterIP: "None",
          ports: [
            {
              name: "https-main",
              port: 8443,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: "https-main" as any
            },
            {
              name: "https-self",
              port: 9443,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: "https-self" as any
            }
          ],
          selector: {
            app: "kube-state-metrics"
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
          labels: {
            app: "kube-state-metrics"
          },
          name: "kube-state-metrics",
          namespace
        },
        spec: {
          replicas: 1,
          selector: {
            matchLabels: {
              app: "kube-state-metrics"
            }
          },
          template: {
            metadata: {
              labels: {
                app: "kube-state-metrics"
              }
            },
            spec: {
              containers: [
                {
                  args: [
                    "--logtostderr",
                    "--secure-listen-address=:8443",
                    "--tls-cipher-suites=TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,TLS_RSA_WITH_AES_128_CBC_SHA256,TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256,TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256",
                    "--upstream=http://127.0.0.1:8081/"
                  ],
                  image: DockerImages.kubeRBACProxy,
                  name: "kube-rbac-proxy-main",
                  ports: [
                    {
                      containerPort: 8443,
                      name: "https-main"
                    }
                  ],
                  resources: {
                    limits: {
                      cpu: "1000m",
                      memory: "40Mi"
                    },
                    requests: {
                      cpu: "50m",
                      memory: "20Mi"
                    }
                  }
                },
                {
                  args: [
                    "--logtostderr",
                    "--secure-listen-address=:9443",
                    "--tls-cipher-suites=TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,TLS_RSA_WITH_AES_128_CBC_SHA256,TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256,TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256",
                    "--upstream=http://127.0.0.1:8082/"
                  ],
                  image: DockerImages.kubeRBACProxy,
                  name: "kube-rbac-proxy-self",
                  ports: [
                    {
                      containerPort: 9443,
                      name: "https-self"
                    }
                  ],
                  resources: {
                    limits: {
                      cpu: "500m",
                      memory: "40Mi"
                    },
                    requests: {
                      cpu: "50m",
                      memory: "20Mi"
                    }
                  }
                },
                {
                  args: [
                    "--host=127.0.0.1",
                    "--port=8081",
                    "--telemetry-host=127.0.0.1",
                    "--telemetry-port=8082"
                  ],
                  image: DockerImages.kubeStateMetrics,
                  name: "kube-state-metrics",
                  resources: {
                    limits: {
                      cpu: "200m",
                      memory: "150Mi"
                    },
                    requests: {
                      cpu: "50m",
                      memory: "100Mi"
                    }
                  }
                },
                {
                  command: [
                    "/pod_nanny",
                    "--container=kube-state-metrics",
                    "--cpu=200m",
                    "--extra-cpu=2m",
                    "--memory=150Mi",
                    "--extra-memory=30Mi",
                    "--threshold=5",
                    "--deployment=kube-state-metrics"
                  ],
                  env: [
                    {
                      name: "MY_POD_NAME",
                      valueFrom: {
                        fieldRef: {
                          apiVersion: "v1",
                          fieldPath: "metadata.name"
                        }
                      }
                    },
                    {
                      name: "MY_POD_NAMESPACE",
                      valueFrom: {
                        fieldRef: {
                          apiVersion: "v1",
                          fieldPath: "metadata.namespace"
                        }
                      }
                    }
                  ],
                  image: DockerImages.addonResizer,
                  name: "addon-resizer",
                  resources: {
                    limits: {
                      cpu: "250m",
                      memory: "30Mi"
                    },
                    requests: {
                      cpu: "50m",
                      memory: "30Mi"
                    }
                  }
                }
              ],
              nodeSelector: {
                "kubernetes.io/os": "linux"
              },
              securityContext: {
                runAsNonRoot: true,
                runAsUser: 65534
              },
              serviceAccountName: "kube-state-metrics"
            }
          }
        }
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
          name: "kube-state-metrics",
          namespace
        },
        rules: [
          {
            apiGroups: [""],
            resources: ["pods"],
            verbs: ["get"]
          },
          {
            apiGroups: ["extensions"],
            resourceNames: ["kube-state-metrics"],
            resources: ["deployments"],
            verbs: ["get", "update"]
          },
          {
            apiGroups: ["apps"],
            resourceNames: ["kube-state-metrics"],
            resources: ["deployments"],
            verbs: ["get", "update"]
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
          name: "kube-state-metrics",
          namespace
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "Role",
          name: "kube-state-metrics"
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: "kube-state-metrics",
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
          name: "kube-state-metrics"
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "ClusterRole",
          name: "kube-state-metrics"
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: "kube-state-metrics",
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
          name: "kube-state-metrics"
        },
        rules: [
          {
            apiGroups: [""],
            resources: [
              "configmaps",
              "secrets",
              "nodes",
              "pods",
              "services",
              "resourcequotas",
              "replicationcontrollers",
              "limitranges",
              "persistentvolumeclaims",
              "persistentvolumes",
              "namespaces",
              "endpoints"
            ],
            verbs: ["list", "watch"]
          },
          {
            apiGroups: ["extensions"],
            resources: [
              "daemonsets",
              "deployments",
              "replicasets",
              "ingresses"
            ],
            verbs: ["list", "watch"]
          },
          {
            apiGroups: ["apps"],
            resources: [
              "statefulsets",
              "daemonsets",
              "deployments",
              "replicasets"
            ],
            verbs: ["list", "watch"]
          },
          {
            apiGroups: ["batch"],
            resources: ["cronjobs", "jobs"],
            verbs: ["list", "watch"]
          },
          {
            apiGroups: ["autoscaling"],
            resources: ["horizontalpodautoscalers"],
            verbs: ["list", "watch"]
          },
          {
            apiGroups: ["authentication.k8s.io"],
            resources: ["tokenreviews"],
            verbs: ["create"]
          },
          {
            apiGroups: ["authorization.k8s.io"],
            resources: ["subjectaccessreviews"],
            verbs: ["create"]
          },
          {
            apiGroups: ["policy"],
            resources: ["poddisruptionbudgets"],
            verbs: ["list", "watch"]
          },
          {
            apiGroups: ["certificates.k8s.io"],
            resources: ["certificatesigningrequests"],
            verbs: ["list", "watch"]
          },
          {
            apiGroups: ["storage.k8s.io"],
            resources: ["storageclasses"],
            verbs: ["list", "watch"]
          }
        ]
      },
      kubeConfig
    )
  );

  return collection;
}
