/**
 * Copyright 2019-2021 Opstrace, Inc.
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
  V1ServicemonitorResource
} from "@opstrace/kubernetes";
import { State } from "../../../reducer";
import { KubeConfig } from "@kubernetes/client-node";

export function KubeServiceMonitorResources(
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
            "k8s-app": "apiserver",
            tenant: "system"
          },
          name: "kube-apiserver",
          namespace
        },
        spec: {
          endpoints: [
            {
              bearerTokenFile:
                "/var/run/secrets/kubernetes.io/serviceaccount/token",
              interval: "30s",
              metricRelabelings: [
                {
                  action: "drop",
                  regex: "etcd_(debugging|disk|request|server).*",
                  sourceLabels: ["__name__"]
                },
                {
                  action: "drop",
                  regex:
                    "apiserver_admission_controller_admission_latencies_seconds_.*",
                  sourceLabels: ["__name__"]
                },
                {
                  action: "drop",
                  regex:
                    "apiserver_admission_step_admission_latencies_seconds_.*",
                  sourceLabels: ["__name__"]
                }
              ],
              port: "https",
              scheme: "https",
              tlsConfig: {
                caFile: "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt",
                serverName: "kubernetes"
              }
            }
          ],
          jobLabel: "component",
          namespaceSelector: {
            matchNames: ["default"]
          },
          selector: {
            matchLabels: {
              component: "apiserver",
              provider: "kubernetes"
            }
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
          labels: {
            "k8s-app": "coredns",
            tenant: "system"
          },
          name: "coredns",
          namespace
        },
        spec: {
          endpoints: [
            {
              bearerTokenFile:
                "/var/run/secrets/kubernetes.io/serviceaccount/token",
              interval: "15s",
              port: "metrics"
            }
          ],
          jobLabel: "k8s-app",
          namespaceSelector: {
            matchNames: ["kube-system"]
          },
          selector: {
            matchLabels: {
              "k8s-app": "kube-dns"
            }
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
          labels: {
            "k8s-app": "kube-controller-manager",
            tenant: "system"
          },
          name: "kube-controller-manager",
          namespace
        },
        spec: {
          endpoints: [
            {
              interval: "30s",
              metricRelabelings: [
                {
                  action: "drop",
                  regex: "etcd_(debugging|disk|request|server).*",
                  sourceLabels: ["__name__"]
                }
              ],
              port: "http-metrics"
            }
          ],
          jobLabel: "k8s-app",
          namespaceSelector: {
            matchNames: ["kube-system"]
          },
          selector: {
            matchLabels: {
              "k8s-app": "kube-controller-manager"
            }
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
          labels: {
            "k8s-app": "kubelet",
            tenant: "system"
          },
          name: "kubelet",
          namespace
        },
        spec: {
          endpoints: [
            {
              bearerTokenFile:
                "/var/run/secrets/kubernetes.io/serviceaccount/token",
              honorLabels: true,
              interval: "30s",
              port: "https-metrics",
              scheme: "https",
              tlsConfig: {
                insecureSkipVerify: true
              }
            },
            {
              bearerTokenFile:
                "/var/run/secrets/kubernetes.io/serviceaccount/token",
              honorLabels: true,
              interval: "30s",
              metricRelabelings: [
                {
                  action: "drop",
                  regex:
                    "container_(network_tcp_usage_total|network_udp_usage_total|tasks_state|cpu_load_average_10s)",
                  sourceLabels: ["__name__"]
                }
              ],
              path: "/metrics/cadvisor",
              port: "https-metrics",
              scheme: "https",
              tlsConfig: {
                insecureSkipVerify: true
              }
            }
          ],
          jobLabel: "k8s-app",
          namespaceSelector: {
            matchNames: ["kube-system"]
          },
          selector: {
            matchLabels: {
              "k8s-app": "kubelet"
            }
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
          labels: {
            "k8s-app": "kube-scheduler",
            tenant: "system"
          },
          name: "kube-scheduler",
          namespace
        },
        spec: {
          endpoints: [
            {
              interval: "30s",
              port: "http-metrics"
            }
          ],
          jobLabel: "k8s-app",
          namespaceSelector: {
            matchNames: ["kube-system"]
          },
          selector: {
            matchLabels: {
              "k8s-app": "kube-scheduler"
            }
          }
        }
      },
      kubeConfig
    )
  );

  return collection;
}
