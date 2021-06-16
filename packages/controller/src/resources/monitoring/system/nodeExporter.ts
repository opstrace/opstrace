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
  DaemonSet,
  V1ServicemonitorResource
} from "@opstrace/kubernetes";
import { State } from "../../../reducer";
import { KubeConfig } from "@kubernetes/client-node";
import { DockerImages, getImagePullSecrets } from "@opstrace/controller-config";

export function NodeExporterResources(
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
            "k8s-app": "node-exporter",
            tenant: "system"
          },
          name: "node-exporter",
          namespace
        },
        spec: {
          endpoints: [
            {
              bearerTokenFile:
                "/var/run/secrets/kubernetes.io/serviceaccount/token",
              interval: "30s",
              port: "https",
              relabelings: [
                {
                  action: "replace",
                  regex: "(.*)",
                  replacment: "$1",
                  sourceLabels: ["__meta_kubernetes_pod_node_name"],
                  targetLabel: "instance"
                }
              ],
              scheme: "https",
              tlsConfig: {
                insecureSkipVerify: true
              }
            }
          ],
          jobLabel: "k8s-app",
          selector: {
            matchLabels: {
              "k8s-app": "node-exporter"
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
          name: "node-exporter",
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
            "k8s-app": "node-exporter"
          },
          name: "node-exporter",
          namespace
        },
        spec: {
          clusterIP: "None",
          ports: [
            {
              name: "https",
              port: 9100,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: "https" as any
            }
          ],
          selector: {
            app: "node-exporter"
          }
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
          labels: {
            app: "node-exporter"
          },
          name: "node-exporter",
          namespace
        },
        spec: {
          selector: {
            matchLabels: {
              app: "node-exporter"
            }
          },
          template: {
            metadata: {
              labels: {
                app: "node-exporter"
              }
            },
            spec: {
              imagePullSecrets: getImagePullSecrets(),
              containers: [
                {
                  args: [
                    "--web.listen-address=127.0.0.1:9100",
                    "--path.procfs=/host/proc",
                    "--path.sysfs=/host/sys",
                    "--path.rootfs=/host/root",
                    "--collector.filesystem.ignored-mount-points=^/(dev|proc|sys|var/lib/docker/.+)($|/)",
                    "--collector.filesystem.ignored-fs-types=^(autofs|binfmt_misc|cgroup|configfs|debugfs|devpts|devtmpfs|fusectl|hugetlbfs|mqueue|overlay|proc|procfs|pstore|rpc_pipefs|securityfs|sysfs|tracefs)$"
                  ],
                  image: DockerImages.nodeExporter,
                  name: "node-exporter",
                  resources: {
                    limits: {
                      cpu: "1700m",
                      memory: "180Mi"
                    },
                    requests: {
                      cpu: "50m",
                      memory: "100Mi"
                    }
                  },
                  volumeMounts: [
                    {
                      mountPath: "/host/proc",
                      name: "proc",
                      readOnly: false
                    },
                    {
                      mountPath: "/host/sys",
                      name: "sys",
                      readOnly: false
                    },
                    {
                      mountPath: "/host/root",
                      mountPropagation: "HostToContainer",
                      name: "root",
                      readOnly: true
                    }
                  ]
                },
                {
                  args: [
                    "--logtostderr",
                    "--secure-listen-address=$(IP):9100",
                    "--tls-cipher-suites=TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,TLS_RSA_WITH_AES_128_CBC_SHA256,TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256,TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256",
                    "--upstream=http://127.0.0.1:9100/"
                  ],
                  env: [
                    {
                      name: "IP",
                      valueFrom: {
                        fieldRef: {
                          fieldPath: "status.podIP"
                        }
                      }
                    }
                  ],
                  image: DockerImages.kubeRBACProxy,
                  name: "kube-rbac-proxy",
                  ports: [
                    {
                      containerPort: 9100,
                      hostPort: 9100,
                      name: "https"
                    }
                  ],
                  resources: {
                    limits: {
                      cpu: "1000m",
                      memory: "60Mi"
                    },
                    requests: {
                      cpu: "50m",
                      memory: "20Mi"
                    }
                  }
                }
              ],
              hostNetwork: true,
              hostPID: true,
              nodeSelector: {
                "kubernetes.io/os": "linux"
              },
              securityContext: {
                runAsNonRoot: true,
                runAsUser: 65534
              },
              serviceAccountName: "node-exporter",
              tolerations: [
                {
                  operator: "Exists"
                }
              ],
              volumes: [
                {
                  hostPath: {
                    path: "/proc"
                  },
                  name: "proc"
                },
                {
                  hostPath: {
                    path: "/sys"
                  },
                  name: "sys"
                },
                {
                  hostPath: {
                    path: "/"
                  },
                  name: "root"
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
    new ClusterRole(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "ClusterRole",
        metadata: {
          name: "node-exporter"
        },
        rules: [
          {
            apiGroups: ["authentication.k8s.io"],
            resources: ["tokenreviews"],
            verbs: ["create"]
          },
          {
            apiGroups: ["authorization.k8s.io"],
            resources: ["subjectaccessreviews"],
            verbs: ["create"]
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
          name: "node-exporter"
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "ClusterRole",
          name: "node-exporter"
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: "node-exporter",
            namespace
          }
        ]
      },
      kubeConfig
    )
  );

  return collection;
}
