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
  ClusterRole,
  ClusterRoleBinding,
  V1PrometheusruleResource,
  Role,
  RoleBinding
} from "@opstrace/kubernetes";
import {
  getTenantNamespace,
  getPrometheusName,
  getDomain
} from "../../../helpers";
import { State } from "../../../reducer";
import { Tenant } from "@opstrace/tenants";

import { KubeConfig } from "@kubernetes/client-node";

import { KubeStateMetricsResources } from "./kubeStateMetrics";
import { NodeExporterResources } from "./nodeExporter";
import { PrometheusAdaptorResources } from "./prometheusAdaptor";
import { KubeServiceMonitorResources } from "./kubeServiceMonitors";

export function SystemMonitoringResources(
  state: State,
  kubeConfig: KubeConfig,
  tenant: Tenant
): ResourceCollection {
  const collection = new ResourceCollection();

  const namespace = getTenantNamespace(tenant);
  const prometheusName = getPrometheusName(tenant);

  const domain = getDomain(state);
  // TODO centralize these URLs
  const runbookUrl =
    "https://github.com/opstrace/opstrace/blob/master/docs/alerts";
  const grafanaArgs = "?orgId=1&refresh=10s&from=now-30m&to=now";
  const grafanaUrl =
    `https://system.${domain}/grafana/d/bF4hjRpZk/opstrace-system` +
    grafanaArgs;

  collection.add(PrometheusAdaptorResources(state, kubeConfig, namespace));
  collection.add(KubeStateMetricsResources(state, kubeConfig, namespace));
  collection.add(NodeExporterResources(state, kubeConfig, namespace));
  collection.add(KubeServiceMonitorResources(state, kubeConfig, namespace));

  /**
   * Namespaces that need monitoring
   */
  state.kubernetes.cluster.Namespaces.resources.forEach(ns => {
    collection.add(
      new Role(
        {
          apiVersion: "rbac.authorization.k8s.io/v1",
          kind: "Role",
          metadata: {
            name: prometheusName,
            namespace: ns.name
          },
          rules: [
            {
              apiGroups: [""],
              resources: ["services", "endpoints", "pods"],
              verbs: ["get", "list", "watch"]
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
            name: prometheusName,
            namespace: ns.name
          },
          roleRef: {
            apiGroup: "rbac.authorization.k8s.io",
            kind: "Role",
            name: prometheusName
          },
          subjects: [
            {
              kind: "ServiceAccount",
              name: prometheusName,
              namespace
            }
          ]
        },
        kubeConfig
      )
    );
  });

  collection.add(
    new RoleBinding(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "RoleBinding",
        metadata: {
          name: "system-prometheus-config",
          namespace
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "Role",
          name: "system-prometheus-config"
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: prometheusName,
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
          name: prometheusName
        },
        rules: [
          {
            apiGroups: [""],
            resources: ["nodes/metrics"],
            verbs: ["get"]
          },
          {
            nonResourceURLs: ["/metrics"],
            verbs: ["get"]
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
          name: prometheusName
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "ClusterRole",
          name: prometheusName
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: prometheusName,
            namespace
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
          name: "system-prometheus-config",
          namespace
        },
        rules: [
          {
            apiGroups: [""],
            resources: ["configmaps"],
            verbs: ["get"]
          }
        ]
      },
      kubeConfig
    )
  );

  collection.add(
    new V1PrometheusruleResource(
      {
        apiVersion: "monitoring.coreos.com/v1",
        kind: "PrometheusRule",
        metadata: {
          labels: {
            prometheus: prometheusName,
            role: "alert-rules"
          },
          name: "system-prometheus-rules",
          namespace
        },
        spec: {
          groups: [
            {
              name: "node-exporter.rules",
              rules: [
                {
                  expr:
                    'count without (cpu) (\n  count without (mode) (\n    node_cpu_seconds_total{job="node-exporter"}\n  )\n)\n',
                  record: "instance:node_num_cpu:sum"
                },
                {
                  expr:
                    '1 - avg without (cpu, mode) (\n  rate(node_cpu_seconds_total{job="node-exporter", mode="idle"}[1m])\n)\n',
                  record: "instance:node_cpu_utilisation:rate1m"
                },
                {
                  expr:
                    '(\n  node_load1{job="node-exporter"}\n/\n  instance:node_num_cpu:sum{job="node-exporter"}\n)\n',
                  record: "instance:node_load1_per_cpu:ratio"
                },
                {
                  expr:
                    '1 - (\n  node_memory_MemAvailable_bytes{job="node-exporter"}\n/\n  node_memory_MemTotal_bytes{job="node-exporter"}\n)\n',
                  record: "instance:node_memory_utilisation:ratio"
                },
                {
                  expr:
                    '(\n  rate(node_vmstat_pgpgin{job="node-exporter"}[1m])\n+\n  rate(node_vmstat_pgpgout{job="node-exporter"}[1m])\n)\n',
                  record: "instance:node_memory_swap_io_pages:rate1m"
                },
                {
                  expr:
                    'rate(node_disk_io_time_seconds_total{job="node-exporter", device=~"nvme.+|rbd.+|sd.+|vd.+|xvd.+|dm-.+"}[1m])\n',
                  record: "instance_device:node_disk_io_time_seconds:rate1m"
                },
                {
                  expr:
                    'rate(node_disk_io_time_weighted_seconds_total{job="node-exporter", device=~"nvme.+|rbd.+|sd.+|vd.+|xvd.+|dm-.+"}[1m])\n',
                  record:
                    "instance_device:node_disk_io_time_weighted_seconds:rate1m"
                },
                {
                  expr:
                    'sum without (device) (\n  rate(node_network_receive_bytes_total{job="node-exporter", device!="lo"}[1m])\n)\n',
                  record:
                    "instance:node_network_receive_bytes_excluding_lo:rate1m"
                },
                {
                  expr:
                    'sum without (device) (\n  rate(node_network_transmit_bytes_total{job="node-exporter", device!="lo"}[1m])\n)\n',
                  record:
                    "instance:node_network_transmit_bytes_excluding_lo:rate1m"
                },
                {
                  expr:
                    'sum without (device) (\n  rate(node_network_receive_drop_total{job="node-exporter", device!="lo"}[1m])\n)\n',
                  record:
                    "instance:node_network_receive_drop_excluding_lo:rate1m"
                },
                {
                  expr:
                    'sum without (device) (\n  rate(node_network_transmit_drop_total{job="node-exporter", device!="lo"}[1m])\n)\n',
                  record:
                    "instance:node_network_transmit_drop_excluding_lo:rate1m"
                }
              ]
            },
            {
              name: "k8s.rules",
              rules: [
                {
                  expr:
                    'sum(rate(container_cpu_usage_seconds_total{job="kubelet", image!="", container!="POD"}[5m])) by (namespace)\n',
                  record: "namespace:container_cpu_usage_seconds_total:sum_rate"
                },
                {
                  expr:
                    'sum by (namespace, pod, container) (\n  rate(container_cpu_usage_seconds_total{job="kubelet", image!="", container!="POD"}[5m])\n)\n',
                  record:
                    "namespace_pod_container:container_cpu_usage_seconds_total:sum_rate"
                },
                {
                  expr:
                    'sum(container_memory_usage_bytes{job="kubelet", image!="", container!="POD"}) by (namespace)\n',
                  record: "namespace:container_memory_usage_bytes:sum"
                },
                {
                  expr:
                    'sum by (namespace, label_name) (\n    sum(kube_pod_container_resource_requests_memory_bytes{job="kube-state-metrics"} * on (endpoint, instance, job, namespace, pod, service) group_left(phase) (kube_pod_status_phase{phase=~"^(Pending|Running)$"} == 1)) by (namespace, pod)\n  * on (namespace, pod)\n    group_left(label_name) kube_pod_labels{job="kube-state-metrics"}\n)\n',
                  record:
                    "namespace:kube_pod_container_resource_requests_memory_bytes:sum"
                },
                {
                  expr:
                    'sum by (namespace, label_name) (\n    sum(kube_pod_container_resource_requests_cpu_cores{job="kube-state-metrics"} * on (endpoint, instance, job, namespace, pod, service) group_left(phase) (kube_pod_status_phase{phase=~"^(Pending|Running)$"} == 1)) by (namespace, pod)\n  * on (namespace, pod)\n    group_left(label_name) kube_pod_labels{job="kube-state-metrics"}\n)\n',
                  record:
                    "namespace:kube_pod_container_resource_requests_cpu_cores:sum"
                },
                {
                  expr:
                    'sum(\n  label_replace(\n    label_replace(\n      kube_pod_owner{job="kube-state-metrics", owner_kind="ReplicaSet"},\n      "replicaset", "$1", "owner_name", "(.*)"\n    ) * on(replicaset, namespace) group_left(owner_name) kube_replicaset_owner{job="kube-state-metrics"},\n    "workload", "$1", "owner_name", "(.*)"\n  )\n) by (namespace, workload, pod)\n',
                  labels: {
                    workload_type: "deployment"
                  },
                  record: "mixin_pod_workload"
                },
                {
                  expr:
                    'sum(\n  label_replace(\n    kube_pod_owner{job="kube-state-metrics", owner_kind="DaemonSet"},\n    "workload", "$1", "owner_name", "(.*)"\n  )\n) by (namespace, workload, pod)\n',
                  labels: {
                    workload_type: "daemonset"
                  },
                  record: "mixin_pod_workload"
                },
                {
                  expr:
                    'sum(\n  label_replace(\n    kube_pod_owner{job="kube-state-metrics", owner_kind="StatefulSet"},\n    "workload", "$1", "owner_name", "(.*)"\n  )\n) by (namespace, workload, pod)\n',
                  labels: {
                    workload_type: "statefulset"
                  },
                  record: "mixin_pod_workload"
                }
              ]
            },
            {
              name: "kube-scheduler.rules",
              rules: [
                {
                  expr:
                    'histogram_quantile(0.99, sum(rate(scheduler_e2e_scheduling_duration_seconds_bucket{job="kube-scheduler"}[5m])) without(instance, pod))\n',
                  labels: {
                    quantile: "0.99"
                  },
                  record:
                    "cluster_quantile:scheduler_e2e_scheduling_duration_seconds:histogram_quantile"
                },
                {
                  expr:
                    'histogram_quantile(0.99, sum(rate(scheduler_scheduling_algorithm_duration_seconds_bucket{job="kube-scheduler"}[5m])) without(instance, pod))\n',
                  labels: {
                    quantile: "0.99"
                  },
                  record:
                    "cluster_quantile:scheduler_scheduling_algorithm_duration_seconds:histogram_quantile"
                },
                {
                  expr:
                    'histogram_quantile(0.99, sum(rate(scheduler_binding_duration_seconds_bucket{job="kube-scheduler"}[5m])) without(instance, pod))\n',
                  labels: {
                    quantile: "0.99"
                  },
                  record:
                    "cluster_quantile:scheduler_binding_duration_seconds:histogram_quantile"
                },
                {
                  expr:
                    'histogram_quantile(0.9, sum(rate(scheduler_e2e_scheduling_duration_seconds_bucket{job="kube-scheduler"}[5m])) without(instance, pod))\n',
                  labels: {
                    quantile: "0.9"
                  },
                  record:
                    "cluster_quantile:scheduler_e2e_scheduling_duration_seconds:histogram_quantile"
                },
                {
                  expr:
                    'histogram_quantile(0.9, sum(rate(scheduler_scheduling_algorithm_duration_seconds_bucket{job="kube-scheduler"}[5m])) without(instance, pod))\n',
                  labels: {
                    quantile: "0.9"
                  },
                  record:
                    "cluster_quantile:scheduler_scheduling_algorithm_duration_seconds:histogram_quantile"
                },
                {
                  expr:
                    'histogram_quantile(0.9, sum(rate(scheduler_binding_duration_seconds_bucket{job="kube-scheduler"}[5m])) without(instance, pod))\n',
                  labels: {
                    quantile: "0.9"
                  },
                  record:
                    "cluster_quantile:scheduler_binding_duration_seconds:histogram_quantile"
                },
                {
                  expr:
                    'histogram_quantile(0.5, sum(rate(scheduler_e2e_scheduling_duration_seconds_bucket{job="kube-scheduler"}[5m])) without(instance, pod))\n',
                  labels: {
                    quantile: "0.5"
                  },
                  record:
                    "cluster_quantile:scheduler_e2e_scheduling_duration_seconds:histogram_quantile"
                },
                {
                  expr:
                    'histogram_quantile(0.5, sum(rate(scheduler_scheduling_algorithm_duration_seconds_bucket{job="kube-scheduler"}[5m])) without(instance, pod))\n',
                  labels: {
                    quantile: "0.5"
                  },
                  record:
                    "cluster_quantile:scheduler_scheduling_algorithm_duration_seconds:histogram_quantile"
                },
                {
                  expr:
                    'histogram_quantile(0.5, sum(rate(scheduler_binding_duration_seconds_bucket{job="kube-scheduler"}[5m])) without(instance, pod))\n',
                  labels: {
                    quantile: "0.5"
                  },
                  record:
                    "cluster_quantile:scheduler_binding_duration_seconds:histogram_quantile"
                }
              ]
            },
            {
              name: "kube-apiserver.rules",
              rules: [
                {
                  expr:
                    'histogram_quantile(0.99, sum(rate(apiserver_request_duration_seconds_bucket{job="apiserver"}[5m])) without(instance, pod))\n',
                  labels: {
                    quantile: "0.99"
                  },
                  record:
                    "cluster_quantile:apiserver_request_duration_seconds:histogram_quantile"
                },
                {
                  expr:
                    'histogram_quantile(0.9, sum(rate(apiserver_request_duration_seconds_bucket{job="apiserver"}[5m])) without(instance, pod))\n',
                  labels: {
                    quantile: "0.9"
                  },
                  record:
                    "cluster_quantile:apiserver_request_duration_seconds:histogram_quantile"
                },
                {
                  expr:
                    'histogram_quantile(0.5, sum(rate(apiserver_request_duration_seconds_bucket{job="apiserver"}[5m])) without(instance, pod))\n',
                  labels: {
                    quantile: "0.5"
                  },
                  record:
                    "cluster_quantile:apiserver_request_duration_seconds:histogram_quantile"
                }
              ]
            },
            {
              name: "node.rules",
              rules: [
                {
                  expr: "sum(min(kube_pod_info) by (node))",
                  record: ":kube_pod_info_node_count:"
                },
                {
                  expr:
                    'max(label_replace(kube_pod_info{job="kube-state-metrics"}, "pod", "$1", "pod", "(.*)")) by (node, namespace, pod)\n',
                  record: "node_namespace_pod:kube_pod_info:"
                },
                {
                  expr:
                    'count by (node) (sum by (node, cpu) (\n  node_cpu_seconds_total{job="node-exporter"}\n* on (namespace, pod) group_left(node)\n  node_namespace_pod:kube_pod_info:\n))\n',
                  record: "node:node_num_cpu:sum"
                },
                {
                  expr:
                    'sum(node_memory_MemFree_bytes{job="node-exporter"} + node_memory_Cached_bytes{job="node-exporter"} + node_memory_Buffers_bytes{job="node-exporter"})\n',
                  record: ":node_memory_MemFreeCachedBuffers_bytes:sum"
                }
              ]
            },
            {
              name: "kube-prometheus-node-recording.rules",
              rules: [
                {
                  expr:
                    'sum(rate(node_cpu_seconds_total{mode!="idle",mode!="iowait"}[3m])) BY\n(instance)',
                  record: "instance:node_cpu:rate:sum"
                },
                {
                  expr:
                    'sum((node_filesystem_size_bytes{mountpoint="/"} - node_filesystem_free_bytes{mountpoint="/"}))\nBY (instance)',
                  record: "instance:node_filesystem_usage:sum"
                },
                {
                  expr:
                    "sum(rate(node_network_receive_bytes_total[3m])) BY (instance)",
                  record: "instance:node_network_receive_bytes:rate:sum"
                },
                {
                  expr:
                    "sum(rate(node_network_transmit_bytes_total[3m])) BY (instance)",
                  record: "instance:node_network_transmit_bytes:rate:sum"
                },
                {
                  expr:
                    'sum(rate(node_cpu_seconds_total{mode!="idle",mode!="iowait"}[5m])) WITHOUT\n(cpu, mode) / ON(instance) GROUP_LEFT() count(sum(node_cpu_seconds_total)\nBY (instance, cpu)) BY (instance)',
                  record: "instance:node_cpu:ratio"
                },
                {
                  expr:
                    'sum(rate(node_cpu_seconds_total{mode!="idle",mode!="iowait"}[5m]))',
                  record: "cluster:node_cpu:sum_rate5m"
                },
                {
                  expr:
                    "cluster:node_cpu_seconds_total:rate5m / count(sum(node_cpu_seconds_total)\nBY (instance, cpu))",
                  record: "cluster:node_cpu:ratio"
                }
              ]
            },
            {
              name: "node-exporter",
              rules: [
                {
                  alert: "NodeFilesystemSpaceFillingUp",
                  annotations: {
                    description:
                      'Filesystem on {{ $labels.device }} at {{ $labels.instance }}\nhas only {{ printf "%.2f" $value }}% available space left and is filling\nup.',
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodefilesystemspacefillingup",
                    summary:
                      "Filesystem is predicted to run out of space within the next 24 hours."
                  },
                  expr:
                    '(\n  node_filesystem_avail_bytes{job="node-exporter",} / node_filesystem_size_bytes{job="node-exporter",} < 0.4\nand\n  predict_linear(node_filesystem_avail_bytes{job="node-exporter",}[6h], 24*60*60) < 0\nand\n  node_filesystem_readonly{job="node-exporter",} == 0\n)\n',
                  for: "1h",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "NodeFilesystemSpaceFillingUp",
                  annotations: {
                    description:
                      'Filesystem on {{ $labels.device }} at {{ $labels.instance }}\nhas only {{ printf "%.2f" $value }}% available space left and is filling\nup fast.',
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodefilesystemspacefillingup",
                    summary:
                      "Filesystem is predicted to run out of space within the next 4 hours."
                  },
                  expr:
                    '(\n  node_filesystem_avail_bytes{job="node-exporter",} / node_filesystem_size_bytes{job="node-exporter",} < 0.2\nand\n  predict_linear(node_filesystem_avail_bytes{job="node-exporter",}[6h], 4*60*60) < 0\nand\n  node_filesystem_readonly{job="node-exporter",} == 0\n)\n',
                  for: "1h",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "NodeFilesystemAlmostOutOfSpace",
                  annotations: {
                    description:
                      'Filesystem on {{ $labels.device }} at {{ $labels.instance }}\nhas only {{ printf "%.2f" $value }}% available space left.',
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodefilesystemalmostoutofspace",
                    summary: "Filesystem has less than 5% space left."
                  },
                  expr:
                    '(\n  node_filesystem_avail_bytes{job="node-exporter",} / node_filesystem_size_bytes{job="node-exporter",} * 100 < 5\nand\n  node_filesystem_readonly{job="node-exporter",} == 0\n)\n',
                  for: "1h",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "NodeFilesystemAlmostOutOfSpace",
                  annotations: {
                    description:
                      'Filesystem on {{ $labels.device }} at {{ $labels.instance }}\nhas only {{ printf "%.2f" $value }}% available space left.',
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodefilesystemalmostoutofspace",
                    summary: "Filesystem has less than 3% space left."
                  },
                  expr:
                    '(\n  node_filesystem_avail_bytes{job="node-exporter",} / node_filesystem_size_bytes{job="node-exporter",} * 100 < 3\nand\n  node_filesystem_readonly{job="node-exporter",} == 0\n)\n',
                  for: "1h",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "NodeFilesystemFilesFillingUp",
                  annotations: {
                    description:
                      'Filesystem on {{ $labels.device }} at {{ $labels.instance }}\nhas only {{ printf "%.2f" $value }}% available inodes left and is filling\nup.',
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodefilesystemfilesfillingup",
                    summary:
                      "Filesystem is predicted to run out of inodes within the next 24 hours."
                  },
                  expr:
                    '(\n  node_filesystem_files_free{job="node-exporter",} / node_filesystem_files{job="node-exporter",} < 0.4\nand\n  predict_linear(node_filesystem_files_free{job="node-exporter",}[6h], 24*60*60) < 0\nand\n  node_filesystem_readonly{job="node-exporter",} == 0\n)\n',
                  for: "1h",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "NodeFilesystemFilesFillingUp",
                  annotations: {
                    description:
                      'Filesystem on {{ $labels.device }} at {{ $labels.instance }}\nhas only {{ printf "%.2f" $value }}% available inodes left and is filling\nup fast.',
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodefilesystemfilesfillingup",
                    summary:
                      "Filesystem is predicted to run out of inodes within the next 4 hours."
                  },
                  expr:
                    '(\n  node_filesystem_files_free{job="node-exporter",} / node_filesystem_files{job="node-exporter",} < 0.2\nand\n  predict_linear(node_filesystem_files_free{job="node-exporter",}[6h], 4*60*60) < 0\nand\n  node_filesystem_readonly{job="node-exporter",} == 0\n)\n',
                  for: "1h",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "NodeFilesystemAlmostOutOfFiles",
                  annotations: {
                    description:
                      'Filesystem on {{ $labels.device }} at {{ $labels.instance }}\nhas only {{ printf "%.2f" $value }}% available inodes left.',
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodefilesystemalmostoutoffiles",
                    summary: "Filesystem has less than 5% inodes left."
                  },
                  expr:
                    '(\n  node_filesystem_files_free{job="node-exporter",} / node_filesystem_files{job="node-exporter",} * 100 < 5\nand\n  node_filesystem_readonly{job="node-exporter",} == 0\n)\n',
                  for: "1h",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "NodeFilesystemAlmostOutOfFiles",
                  annotations: {
                    description:
                      'Filesystem on {{ $labels.device }} at {{ $labels.instance }}\nhas only {{ printf "%.2f" $value }}% available inodes left.',
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodefilesystemalmostoutoffiles",
                    summary: "Filesystem has less than 3% inodes left."
                  },
                  expr:
                    '(\n  node_filesystem_files_free{job="node-exporter",} / node_filesystem_files{job="node-exporter",} * 100 < 3\nand\n  node_filesystem_readonly{job="node-exporter",} == 0\n)\n',
                  for: "1h",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "NodeNetworkReceiveErrs",
                  annotations: {
                    description:
                      '{{ $labels.instance }} interface {{ $labels.device }} has encountered\n{{ printf "%.0f" $value }} receive errors in the last two minutes.',
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodenetworkreceiveerrs",
                    summary:
                      "Network interface is reporting many receive errors."
                  },
                  expr: "increase(node_network_receive_errs_total[2m]) > 10\n",
                  for: "1h",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "NodeNetworkTransmitErrs",
                  annotations: {
                    description:
                      '{{ $labels.instance }} interface {{ $labels.device }} has encountered\n{{ printf "%.0f" $value }} transmit errors in the last two minutes.',
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodenetworktransmiterrs",
                    summary:
                      "Network interface is reporting many transmit errors."
                  },
                  expr: "increase(node_network_transmit_errs_total[2m]) > 10\n",
                  for: "1h",
                  labels: {
                    severity: "warning"
                  }
                }
              ]
            },
            {
              name: "kubernetes-absent",
              rules: [
                {
                  alert: "AlertmanagerDown",
                  annotations: {
                    message:
                      "Alertmanager has disappeared from Prometheus target discovery.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-alertmanagerdown"
                  },
                  expr: `absent(up{job="alertmanager"} == 1)`,
                  for: "15m",
                  labels: {
                    severity: "critical"
                  }
                },
                // Commented out because this metric doesn't appear to exist in GKE
                //
                // {
                // alert: "CoreDNSDown",
                // annotations: {
                // message:
                // "CoreDNS has disappeared from Prometheus target discovery.",
                // runbook_url:
                // "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-corednsdown"
                // },
                // expr: 'absent(up{job="kube-dns"} == 1)\n',
                // for: "15m",
                // labels: {
                // severity: "critical"
                // }
                // },
                {
                  alert: "KubeAPIDown",
                  annotations: {
                    message:
                      "KubeAPI has disappeared from Prometheus target discovery.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubeapidown"
                  },
                  expr: 'absent(up{job="apiserver"} == 1)\n',
                  for: "15m",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "KubeStateMetricsDown",
                  annotations: {
                    message:
                      "KubeStateMetrics has disappeared from Prometheus target discovery.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubestatemetricsdown"
                  },
                  expr: 'absent(up{job="kube-state-metrics"} == 1)\n',
                  for: "15m",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "KubeletDown",
                  annotations: {
                    message:
                      "Kubelet has disappeared from Prometheus target discovery.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubeletdown"
                  },
                  expr: 'absent(up{job="kubelet"} == 1)\n',
                  for: "15m",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "NodeExporterDown",
                  annotations: {
                    message:
                      "NodeExporter has disappeared from Prometheus target discovery.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodeexporterdown"
                  },
                  expr: 'absent(up{job="node-exporter"} == 1)\n',
                  for: "15m",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "PrometheusDown",
                  annotations: {
                    message:
                      "Prometheus has disappeared from Prometheus target discovery.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-prometheusdown"
                  },
                  expr: `absent(up{service="prometheus"} == 1)`,
                  for: "15m",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "PrometheusOperatorDown",
                  annotations: {
                    message:
                      "PrometheusOperator has disappeared from Prometheus target discovery.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-prometheusoperatordown"
                  },
                  expr: 'absent(up{job="prometheus-operator"} == 1)\n',
                  for: "15m",
                  labels: {
                    severity: "critical"
                  }
                }
              ]
            },
            {
              name: "kubernetes-apps",
              rules: [
                {
                  alert: "KubePodCrashLooping",
                  annotations: {
                    message:
                      'Pod {{ $labels.namespace }}/{{ $labels.pod }} ({{ $labels.container }}) is restarting {{ printf "%.2f" $value }} times / 5 minutes.',
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubepodcrashlooping"
                  },
                  expr:
                    'rate(kube_pod_container_status_restarts_total{job="kube-state-metrics"}[15m]) * 60 * 5 > 0\n',
                  for: "15m",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "KubePodNotReady",
                  annotations: {
                    message:
                      "Pod {{ $labels.namespace }}/{{ $labels.pod }} has been in a non-ready\nstate for longer than 15 minutes.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubepodnotready"
                  },
                  expr:
                    'sum by (namespace, pod) (kube_pod_status_phase{job="kube-state-metrics", phase=~"Failed|Pending|Unknown"}) > 0\n',
                  for: "15m",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "KubeDeploymentGenerationMismatch",
                  annotations: {
                    message:
                      "Deployment generation for {{ $labels.namespace }}/{{ $labels.deployment }} does not match, this indicates that the Deployment has failed but has not been rolled back.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubedeploymentgenerationmismatch"
                  },
                  expr:
                    'kube_deployment_status_observed_generation{job="kube-state-metrics"}\n  !=\nkube_deployment_metadata_generation{job="kube-state-metrics"}\n',
                  for: "15m",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "KubeDeploymentReplicasMismatch",
                  annotations: {
                    message:
                      "Deployment {{ $labels.namespace }}/{{ $labels.deployment }} has not\nmatched the expected number of replicas for longer than 15 minutes.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubedeploymentreplicasmismatch"
                  },
                  expr:
                    'kube_deployment_spec_replicas{job="kube-state-metrics"}\n  !=\nkube_deployment_status_replicas_available{job="kube-state-metrics"}\n',
                  for: "15m",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "KubeStatefulSetReplicasMismatch",
                  annotations: {
                    message:
                      "StatefulSet {{ $labels.namespace }}/{{ $labels.statefulset }} has\nnot matched the expected number of replicas for longer than 15 minutes.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubestatefulsetreplicasmismatch"
                  },
                  expr:
                    'kube_statefulset_status_replicas_ready{job="kube-state-metrics"}\n  !=\nkube_statefulset_status_replicas{job="kube-state-metrics"}\n',
                  for: "15m",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "KubeStatefulSetGenerationMismatch",
                  annotations: {
                    message:
                      "StatefulSet generation for {{ $labels.namespace }}/{{ $labels.statefulset }} does not match, this indicates that the StatefulSet has failed but has not been rolled back.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubestatefulsetgenerationmismatch"
                  },
                  expr:
                    'kube_statefulset_status_observed_generation{job="kube-state-metrics"}\n  !=\nkube_statefulset_metadata_generation{job="kube-state-metrics"}\n',
                  for: "15m",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "KubeStatefulSetUpdateNotRolledOut",
                  annotations: {
                    message:
                      "StatefulSet {{ $labels.namespace }}/{{ $labels.statefulset }} update\nhas not been rolled out.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubestatefulsetupdatenotrolledout"
                  },
                  expr:
                    'max without (revision) (\n  kube_statefulset_status_current_revision{job="kube-state-metrics"}\n    unless\n  kube_statefulset_status_update_revision{job="kube-state-metrics"}\n)\n  *\n(\n  kube_statefulset_replicas{job="kube-state-metrics"}\n    !=\n  kube_statefulset_status_replicas_updated{job="kube-state-metrics"}\n)\n',
                  for: "15m",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "KubeDaemonSetRolloutStuck",
                  annotations: {
                    message:
                      "Only {{ $value }}% of the desired Pods of DaemonSet {{ $labels.namespace }}/{{ $labels.daemonset }} are scheduled and ready.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubedaemonsetrolloutstuck"
                  },
                  expr:
                    'kube_daemonset_status_number_ready{job="kube-state-metrics"}\n  /\nkube_daemonset_status_desired_number_scheduled{job="kube-state-metrics"} * 100 < 100\n',
                  for: "15m",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "KubeDaemonSetNotScheduled",
                  annotations: {
                    message:
                      "{{ $value }} Pods of DaemonSet {{ $labels.namespace }}/{{ $labels.daemonset }} are not scheduled.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubedaemonsetnotscheduled"
                  },
                  expr:
                    'kube_daemonset_status_desired_number_scheduled{job="kube-state-metrics"}\n  -\nkube_daemonset_status_current_number_scheduled{job="kube-state-metrics"} > 0\n',
                  for: "10m",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "KubeDaemonSetMisScheduled",
                  annotations: {
                    message:
                      "{{ $value }} Pods of DaemonSet {{ $labels.namespace }}/{{ $labels.daemonset }} are running where they are not supposed to run.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubedaemonsetmisscheduled"
                  },
                  expr:
                    'kube_daemonset_status_number_misscheduled{job="kube-state-metrics"} > 0\n',
                  for: "10m",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "KubeCronJobRunning",
                  annotations: {
                    message:
                      "CronJob {{ $labels.namespace }}/{{ $labels.cronjob }} is taking more\nthan 1h to complete.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubecronjobrunning"
                  },
                  expr:
                    'time() - kube_cronjob_next_schedule_time{job="kube-state-metrics"} > 3600\n',
                  for: "1h",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "KubeJobCompletion",
                  annotations: {
                    message:
                      "Job {{ $labels.namespace }}/{{ $labels.job_name }} is taking more\nthan one hour to complete.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubejobcompletion"
                  },
                  expr:
                    'kube_job_spec_completions{job="kube-state-metrics"} - kube_job_status_succeeded{job="kube-state-metrics"}  > 0\n',
                  for: "1h",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "KubeJobFailed",
                  annotations: {
                    message:
                      "Job {{ $labels.namespace }}/{{ $labels.job_name }} failed to complete.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubejobfailed"
                  },
                  expr:
                    'kube_job_status_failed{job="kube-state-metrics"}  > 0\n',
                  for: "15m",
                  labels: {
                    severity: "warning"
                  }
                }
              ]
            },
            {
              name: "kubernetes-resources",
              rules: [
                {
                  alert: "KubeCPUOvercommit",
                  annotations: {
                    message:
                      "Cluster has overcommitted CPU resource requests for Pods and cannot\ntolerate node failure.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubecpuovercommit"
                  },
                  expr:
                    "sum(namespace:kube_pod_container_resource_requests_cpu_cores:sum)\n  /\nsum(kube_node_status_allocatable_cpu_cores)\n  >\n(count(kube_node_status_allocatable_cpu_cores)-1) / count(kube_node_status_allocatable_cpu_cores)\n",
                  for: "5m",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "KubeMemOvercommit",
                  annotations: {
                    message:
                      "Cluster has overcommitted memory resource requests for Pods and cannot\ntolerate node failure.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubememovercommit"
                  },
                  expr:
                    "sum(namespace:kube_pod_container_resource_requests_memory_bytes:sum)\n  /\nsum(kube_node_status_allocatable_memory_bytes)\n  >\n(count(kube_node_status_allocatable_memory_bytes)-1)\n  /\ncount(kube_node_status_allocatable_memory_bytes)\n",
                  for: "5m",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "KubeCPUOvercommit",
                  annotations: {
                    message:
                      "Cluster has overcommitted CPU resource requests for Namespaces.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubecpuovercommit"
                  },
                  expr:
                    'sum(kube_resourcequota{job="kube-state-metrics", type="hard", resource="cpu"})\n  /\nsum(kube_node_status_allocatable_cpu_cores)\n  > 1.5\n',
                  for: "5m",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "KubeMemOvercommit",
                  annotations: {
                    message:
                      "Cluster has overcommitted memory resource requests for Namespaces.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubememovercommit"
                  },
                  expr:
                    'sum(kube_resourcequota{job="kube-state-metrics", type="hard", resource="memory"})\n  /\nsum(kube_node_status_allocatable_memory_bytes{job="node-exporter"})\n  > 1.5\n',
                  for: "5m",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "KubeQuotaExceeded",
                  annotations: {
                    message:
                      'Namespace {{ $labels.namespace }} is using {{ printf "%0.0f" $value }}% of its {{ $labels.resource }} quota.',
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubequotaexceeded"
                  },
                  expr:
                    '100 * kube_resourcequota{job="kube-state-metrics", type="used"}\n  / ignoring(instance, job, type)\n(kube_resourcequota{job="kube-state-metrics", type="hard"} > 0)\n  > 90\n',
                  for: "15m",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  // For this alert, we will ignore all of the kube-system pods, as they are run by
                  // GKE on our instances and routinely get throttled with no (obvious) method to
                  // configure the resource limits.
                  alert: "CPUThrottlingHigh",
                  annotations: {
                    message:
                      '{{ printf "%0.0f" $value }}% throttling of CPU in namespace {{ $labels.namespace }} for container {{ $labels.container }} in pod {{ $labels.pod }}.',
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-cputhrottlinghigh"
                  },
                  expr:
                    '100 * sum(increase(container_cpu_cfs_throttled_periods_total{namespace!="kube-system", container!~".*config-reloader"\n}[5m])) by (container, pod, namespace)\n  /\nsum(increase(container_cpu_cfs_periods_total{}[5m]))\nby (container, pod, namespace)\n  > 25 \n',
                  for: "15m",
                  labels: {
                    severity: "critical"
                  }
                }
              ]
            },
            {
              name: "kubernetes-storage",
              rules: [
                {
                  alert: "KubePersistentVolumeUsageCritical",
                  annotations: {
                    message:
                      'The PersistentVolume claimed by {{ $labels.persistentvolumeclaim }} in Namespace {{ $labels.namespace }} is only {{ printf "%0.2f" $value }}% free.',
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubepersistentvolumeusagecritical"
                  },
                  expr:
                    '100 * kubelet_volume_stats_available_bytes{job="kubelet"}\n  /\nkubelet_volume_stats_capacity_bytes{job="kubelet"}\n  < 3\n',
                  for: "1m",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "KubePersistentVolumeFullInFourDays",
                  annotations: {
                    message:
                      'Based on recent sampling, the PersistentVolume claimed by {{ $labels.persistentvolumeclaim }} in Namespace {{ $labels.namespace }} is expected to fill up within four\ndays. Currently {{ printf "%0.2f" $value }}% is available.',
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubepersistentvolumefullinfourdays"
                  },
                  expr:
                    '100 * (\n  kubelet_volume_stats_available_bytes{job="kubelet"}\n    /\n  kubelet_volume_stats_capacity_bytes{job="kubelet"}\n) < 15\nand\npredict_linear(kubelet_volume_stats_available_bytes{job="kubelet"}[6h], 4 * 24 * 3600) < 0\n',
                  for: "5m",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "KubePersistentVolumeErrors",
                  annotations: {
                    message:
                      "The persistent volume {{ $labels.persistentvolume }} has status {{ $labels.phase }}.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubepersistentvolumeerrors"
                  },
                  expr:
                    'kube_persistentvolume_status_phase{phase=~"Failed|Pending",job="kube-state-metrics"} > 0\n',
                  for: "5m",
                  labels: {
                    severity: "critical"
                  }
                }
              ]
            },
            {
              name: "kubernetes-system",
              rules: [
                {
                  alert: "KubeNodeNotReady",
                  annotations: {
                    message:
                      "{{ $labels.node }} has been unready for more than an hour.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubenodenotready"
                  },
                  expr:
                    'kube_node_status_condition{job="kube-state-metrics",condition="Ready",status="true"} == 0\n',
                  for: "15m",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "KubeVersionMismatch",
                  annotations: {
                    message:
                      "There are {{ $value }} different semantic versions of Kubernetes\ncomponents running.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubeversionmismatch"
                  },
                  expr:
                    'count(count by (gitVersion) (label_replace(kubernetes_build_info{job!~"kube-dns|coredns"},"gitVersion","$1","gitVersion","(v[0-9]*.[0-9]*.[0-9]*).*"))) > 1\n',
                  for: "15m",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "KubeClientErrors",
                  annotations: {
                    message:
                      "Kubernetes API server client '{{ $labels.job }}/{{ $labels.instance }}' is experiencing {{ printf \"%0.0f\" $value }}% errors.'",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubeclienterrors"
                  },
                  expr:
                    '(sum(rate(rest_client_requests_total{code=~"5.."}[5m])) by (instance, job)\n  /\nsum(rate(rest_client_requests_total[5m])) by (instance, job))\n* 100 > 1\n',
                  for: "15m",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "KubeClientErrors",
                  annotations: {
                    message:
                      "Kubernetes API server client '{{ $labels.job }}/{{ $labels.instance }}' is experiencing {{ printf \"%0.0f\" $value }} errors / second.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubeclienterrors"
                  },
                  expr:
                    'sum(rate(ksm_scrape_error_total{job="kube-state-metrics"}[5m])) by (instance, job) > 0.1\n',
                  for: "15m",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "KubeletTooManyPods",
                  annotations: {
                    message:
                      "Kubelet {{ $labels.instance }} is running {{ $value }} Pods, close\nto the limit of 110.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubelettoomanypods"
                  },
                  expr:
                    'kubelet_running_pod_count{job="kubelet"} > 110 * 0.9\n',
                  for: "15m",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "KubeAPILatencyHigh",
                  annotations: {
                    message:
                      "The API server has a 99th percentile latency of {{ $value }} seconds\nfor {{ $labels.verb }} {{ $labels.resource }}.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubeapilatencyhigh"
                  },
                  expr:
                    'cluster_quantile:apiserver_request_duration_seconds:histogram_quantile{job="apiserver",quantile="0.99",subresource!="log",verb!~"^(?:LIST|WATCH|WATCHLIST|PROXY|CONNECT)$"} > 1\n',
                  for: "10m",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "KubeAPILatencyHigh",
                  annotations: {
                    message:
                      "The API server has a 99th percentile latency of {{ $value }} seconds\nfor {{ $labels.verb }} {{ $labels.resource }}.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubeapilatencyhigh"
                  },
                  expr:
                    'cluster_quantile:apiserver_request_duration_seconds:histogram_quantile{job="apiserver",quantile="0.99",subresource!="log",verb!~"^(?:LIST|WATCH|WATCHLIST|PROXY|CONNECT)$"} > 4\n',
                  for: "10m",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "KubeAPIErrorsHigh",
                  annotations: {
                    message:
                      "API server is returning errors for {{ $value }}% of requests.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubeapierrorshigh"
                  },
                  expr:
                    'sum(rate(apiserver_request_total{job="apiserver",code=~"^(?:5..)$"}[5m]))\n  /\nsum(rate(apiserver_request_total{job="apiserver"}[5m])) * 100 > 3\n',
                  for: "10m",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "KubeAPIErrorsHigh",
                  annotations: {
                    message:
                      "API server is returning errors for {{ $value }}% of requests.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubeapierrorshigh"
                  },
                  expr:
                    'sum(rate(apiserver_request_total{job="apiserver",code=~"^(?:5..)$"}[5m]))\n  /\nsum(rate(apiserver_request_total{job="apiserver"}[5m])) * 100 > 1\n',
                  for: "10m",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "KubeAPIErrorsHigh",
                  annotations: {
                    message:
                      "API server is returning errors for {{ $value }}% of requests for\n{{ $labels.verb }} {{ $labels.resource }} {{ $labels.subresource }}.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubeapierrorshigh"
                  },
                  expr:
                    'sum(rate(apiserver_request_total{job="apiserver",code=~"^(?:5..)$"}[5m])) by (resource,subresource,verb)\n  /\nsum(rate(apiserver_request_total{job="apiserver"}[5m])) by (resource,subresource,verb) * 100 > 10\n',
                  for: "10m",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "KubeAPIErrorsHigh",
                  annotations: {
                    message:
                      "API server is returning errors for {{ $value }}% of requests for\n{{ $labels.verb }} {{ $labels.resource }} {{ $labels.subresource }}.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubeapierrorshigh"
                  },
                  expr:
                    'sum(rate(apiserver_request_total{job="apiserver",code=~"^(?:5..)$"}[5m])) by (resource,subresource,verb)\n  /\nsum(rate(apiserver_request_total{job="apiserver"}[5m])) by (resource,subresource,verb) * 100 > 5\n',
                  for: "10m",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "KubeClientCertificateExpiration",
                  annotations: {
                    message:
                      "A client certificate used to authenticate to the apiserver is expiring\nin less than 7.0 days.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubeclientcertificateexpiration"
                  },
                  expr:
                    'apiserver_client_certificate_expiration_seconds_count{job="apiserver"} > 0 and histogram_quantile(0.01, sum by (job, le) (rate(apiserver_client_certificate_expiration_seconds_bucket{job="apiserver"}[5m]))) < 604800\n',
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "KubeClientCertificateExpiration",
                  annotations: {
                    message:
                      "A client certificate used to authenticate to the apiserver is expiring\nin less than 24.0 hours.",
                    runbook_url:
                      "https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubeclientcertificateexpiration"
                  },
                  expr:
                    'apiserver_client_certificate_expiration_seconds_count{job="apiserver"} > 0 and histogram_quantile(0.01, sum by (job, le) (rate(apiserver_client_certificate_expiration_seconds_bucket{job="apiserver"}[5m]))) < 86400\n',
                  labels: {
                    severity: "critical"
                  }
                }
              ]
            },
            {
              name: "prometheus",
              rules: [
                {
                  alert: "PrometheusBadConfig",
                  annotations: {
                    description:
                      "Prometheus {{$labels.namespace}}/{{$labels.pod}} has failed to\nreload its configuration.",
                    summary: "Failed Prometheus configuration reload."
                  },
                  expr: `max_over_time(prometheus_config_last_reload_successful{job="${prometheusName}"}[5m]) == 0`,
                  for: "10m",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "PrometheusNotificationQueueRunningFull",
                  annotations: {
                    description:
                      "Alert notification queue of Prometheus {{$labels.namespace}}/{{$labels.pod}}\nis running full.",
                    summary:
                      "Prometheus alert notification queue predicted to run full in less\nthan 30m."
                  },
                  expr: `(\n  predict_linear(prometheus_notifications_queue_length{job="${prometheusName}"}[5m], 60 * 30)\n>\n  min_over_time(prometheus_notifications_queue_capacity{job="${prometheusName}"}[5m])\n)`,
                  for: "15m",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "PrometheusErrorSendingAlertsToSomeAlertmanagers",
                  annotations: {
                    description:
                      '{{ printf "%.1f" $value }}% errors while sending alerts from\nPrometheus {{$labels.namespace}}/{{$labels.pod}} to Alertmanager {{$labels.alertmanager}}.',
                    summary:
                      "Prometheus has encountered more than 1% errors sending alerts to\na specific Alertmanager."
                  },
                  expr: `(\n  rate(prometheus_notifications_errors_total{job="${prometheusName}"}[5m])\n/\n  rate(prometheus_notifications_sent_total{job="${prometheusName}"}[5m])\n)\n* 100\n> 1`,
                  for: "15m",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "PrometheusErrorSendingAlertsToAnyAlertmanager",
                  annotations: {
                    description:
                      '{{ printf "%.1f" $value }}% minimum errors while sending alerts\nfrom Prometheus {{$labels.namespace}}/{{$labels.pod}} to any Alertmanager.',
                    summary:
                      "Prometheus encounters more than 3% errors sending alerts to any Alertmanager."
                  },
                  expr: `min without(alertmanager) (\n  rate(prometheus_notifications_errors_total{job="${prometheusName}"}[5m])\n/\n  rate(prometheus_notifications_sent_total{job="${prometheusName}"}[5m])\n)\n* 100\n> 3`,
                  for: "15m",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "PrometheusNotConnectedToAlertmanagers",
                  annotations: {
                    description:
                      "Prometheus {{$labels.namespace}}/{{$labels.pod}} is not connected\nto any Alertmanagers.",
                    summary: "Prometheus is not connected to any Alertmanagers."
                  },
                  expr: `max_over_time(prometheus_notifications_alertmanagers_discovered{service="prometheus"}[5m]) < 1`,
                  for: "10m",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "PrometheusTSDBReloadsFailing",
                  annotations: {
                    description:
                      "Prometheus {{$labels.namespace}}/{{$labels.pod}} has detected\n{{$value | humanize}} reload failures over the last 3h.",
                    summary: "Prometheus has issues reloading blocks from disk."
                  },
                  expr: `increase(prometheus_tsdb_reloads_failures_total{service="prometheus"}[3h]) > 0`,
                  for: "4h",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "PrometheusTSDBCompactionsFailing",
                  annotations: {
                    description:
                      "Prometheus {{$labels.namespace}}/{{$labels.pod}} has detected\n{{$value | humanize}} compaction failures over the last 3h.",
                    summary: "Prometheus has issues compacting blocks."
                  },
                  expr: `increase(prometheus_tsdb_compactions_failed_total{service="prometheus"}[3h]) > 0`,
                  for: "4h",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "PrometheusTSDBWALCorruptions",
                  annotations: {
                    description:
                      "Prometheus {{$labels.namespace}}/{{$labels.pod}} has detected\n{{$value | humanize}} corruptions of the write-ahead log (WAL) over the\nlast 3h.",
                    summary: "Prometheus is detecting WAL corruptions."
                  },
                  expr: `increase(tsdb_wal_corruptions_total{service="prometheus"}[3h]) > 0`,
                  for: "4h",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "PrometheusNotIngestingSamples",
                  annotations: {
                    description:
                      "Prometheus {{$labels.namespace}}/{{$labels.pod}} is not ingesting\nsamples.",
                    summary: "Prometheus is not ingesting samples."
                  },
                  expr: `rate(prometheus_tsdb_head_samples_appended_total{job="${prometheusName}"}[5m]) <= 0`,
                  for: "10m",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "PrometheusDuplicateTimestamps",
                  annotations: {
                    description:
                      "Prometheus {{$labels.namespace}}/{{$labels.pod}} is dropping\n{{$value | humanize}} samples/s with different values but duplicated timestamp.",
                    summary:
                      "Prometheus is dropping samples with duplicate timestamps."
                  },
                  expr: `rate(prometheus_target_scrapes_sample_duplicate_timestamp_total{service="prometheus"}[5m]) > 0`,
                  for: "10m",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "PrometheusOutOfOrderTimestamps",
                  annotations: {
                    description:
                      "Prometheus {{$labels.namespace}}/{{$labels.pod}} is dropping\n{{$value | humanize}} samples/s with timestamps arriving out of order.",
                    summary:
                      "Prometheus drops samples with out-of-order timestamps."
                  },
                  expr: `rate(prometheus_target_scrapes_sample_out_of_order_total{service="prometheus"}[5m]) > 0`,
                  for: "10m",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "PrometheusRemoteStorageFailures",
                  annotations: {
                    description:
                      'Prometheus {{$labels.namespace}}/{{$labels.pod}} failed to send\n{{ printf "%.1f" $value }}% of the samples to queue {{$labels.queue}}.',
                    summary:
                      "Prometheus fails to send samples to remote storage."
                  },
                  expr: `(\n  rate(prometheus_remote_storage_failed_samples_total{service="prometheus"}[5m])\n/\n  (\n    rate(prometheus_remote_storage_failed_samples_total{service="prometheus"}[5m])\n  +\n    rate(prometheus_remote_storage_succeeded_samples_total{service="prometheus"}[5m])\n  )\n)\n* 100\n> 1`,
                  for: "15m",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "PrometheusRemoteWriteBehind",
                  annotations: {
                    description:
                      'Prometheus {{$labels.namespace}}/{{$labels.pod}} remote write\nis {{ printf "%.1f" $value }}s behind for queue {{$labels.queue}}.',
                    summary: "Prometheus remote write is behind."
                  },
                  expr: `(\n  max_over_time(prometheus_remote_storage_highest_timestamp_in_seconds{service="prometheus"}[5m])\n- on(job, instance) group_right\n  max_over_time(prometheus_remote_storage_queue_highest_sent_timestamp_seconds{service="prometheus"}[5m])\n)\n> 120`,
                  for: "15m",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "PrometheusRuleFailures",
                  annotations: {
                    description:
                      'Prometheus {{$labels.namespace}}/{{$labels.pod}} has failed to\nevaluate {{ printf "%.0f" $value }} rules in the last 5m.',
                    summary: "Prometheus is failing rule evaluations."
                  },
                  expr: `increase(prometheus_rule_evaluation_failures_total{service="prometheus"}[5m]) > 0`,
                  for: "15m",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "PrometheusMissingRuleEvaluations",
                  annotations: {
                    description:
                      'Prometheus {{$labels.namespace}}/{{$labels.pod}} has missed {{ printf "%.0f" $value }} rule group evaluations in the last 5m.',
                    summary:
                      "Prometheus is missing rule evaluations due to slow rule group evaluation."
                  },
                  expr: `increase(prometheus_rule_group_iterations_missed_total{}[5m]) > 0`,
                  for: "15m",
                  labels: {
                    severity: "warning"
                  }
                }
              ]
            },
            {
              name: "alertmanager.rules",
              rules: [
                {
                  alert: "AlertmanagerConfigInconsistent",
                  annotations: {
                    message:
                      "The configuration of the instances of the Alertmanager cluster `{{$labels.service}}`\nare out of sync."
                  },
                  expr: `count_values("config_hash", alertmanager_config_hash{job="alertmanager"}) BY (namespace) / ON(namespace) GROUP_LEFT() label_replace(max(prometheus_operator_spec_replicas{job="prometheus-operator",controller="alertmanager"}) by (name, job, namespace, controller), "service", "alertmanager-$1", "name", "(.*)") != 1`,
                  for: "5m",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "AlertmanagerFailedReload",
                  annotations: {
                    message:
                      "Reloading Alertmanager's configuration has failed for {{ $labels.namespace }}/{{ $labels.pod}}."
                  },
                  expr: `alertmanager_config_last_reload_successful{job="alertmanager"} == 0`,
                  for: "10m",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "AlertmanagerMembersInconsistent",
                  annotations: {
                    message:
                      "Alertmanager has not found all other members of the cluster."
                  },
                  expr: `alertmanager_cluster_members{job="alertmanager"}\n  != on (namespace) GROUP_LEFT()\ncount by (namespace) (alertmanager_cluster_members{job="alertmanager"})`,
                  for: "5m",
                  labels: {
                    severity: "critical"
                  }
                }
              ]
            },
            {
              name: "general.rules",
              rules: [
                {
                  alert: "TargetDown",
                  annotations: {
                    message:
                      "{{ $value }}% of the {{ $labels.job }} targets are down."
                  },
                  expr:
                    // TODO (clambert) put this back to the original value, after figuring out why it doesn't work
                    "100 * (count(up == 0) BY (job, namespace, service) / count(up) BY (job, namespace, service)) > 100", // 10",
                  for: "10m",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "Watchdog",
                  annotations: {
                    message:
                      'This is an alert meant to ensure that the entire alerting pipeline is functional.\nThis alert is always firing, therefore it should always be firing in Alertmanager\nand always fire against a receiver. There are integrations with various notification\nmechanisms that send a notification when this alert is not firing. For example the\n"DeadMansSnitch" integration in PagerDuty.\n'
                  },
                  expr: "vector(1)",
                  labels: {
                    severity: "none"
                  }
                }
              ]
            },
            {
              name: "node-time",
              rules: [
                {
                  alert: "ClockSkewDetected",
                  annotations: {
                    message:
                      "Clock skew detected on node-exporter {{ $labels.namespace }}/{{ $labels.pod }}. Ensure NTP is configured correctly on this host."
                  },
                  expr:
                    'abs(node_timex_offset_seconds{job="node-exporter"}) > 0.05\n',
                  for: "2m",
                  labels: {
                    severity: "warning"
                  }
                }
              ]
            },
            {
              name: "node-network",
              rules: [
                {
                  alert: "NodeNetworkInterfaceFlapping",
                  annotations: {
                    message:
                      'Network interface "{{ $labels.device }}" changing it\'s up status\noften on node-exporter {{ $labels.namespace }}/{{ $labels.pod }}"'
                  },
                  expr:
                    'changes(node_network_up{job="node-exporter",device!~"veth.+"}[2m]) > 2\n',
                  for: "2m",
                  labels: {
                    severity: "warning"
                  }
                }
              ]
            },
            {
              name: "prometheus-operator",
              rules: [
                {
                  alert: "PrometheusOperatorReconcileErrors",
                  annotations: {
                    message:
                      "Errors while reconciling {{ $labels.controller }} in {{ $labels.namespace }} Namespace."
                  },
                  expr:
                    'rate(prometheus_operator_reconcile_errors_total{job="prometheus-operator"}[5m]) > 0.1\n',
                  for: "10m",
                  labels: {
                    severity: "warning"
                  }
                },
                {
                  alert: "PrometheusOperatorNodeLookupErrors",
                  annotations: {
                    message:
                      "Errors while reconciling Prometheus in {{ $labels.namespace }} Namespace."
                  },
                  expr:
                    'rate(prometheus_operator_node_address_lookup_errors_total{job="prometheus-operator"}[5m]) > 0.1\n',
                  for: "10m",
                  labels: {
                    severity: "warning"
                  }
                }
              ]
            },
            {
              name: "opstrace-system",
              rules: [
                {
                  alert: "NodeCPUUtilizationSevere",
                  annotations: {
                    message: "Node CPU utilization is severe.",
                    runbook_url:
                      runbookUrl + "/system.md#NodeCPUUtilizationSevere",
                    dashboard: grafanaUrl
                  },
                  expr:
                    '(\ninstance:node_cpu_utilisation:rate1m{job="node-exporter"}\n *\n instance:node_num_cpu:sum{job="node-exporter"}\n / ignoring (instance) group_left\n sum without (instance) (instance:node_num_cpu:sum{job="node-exporter"}) > .8\n)',
                  for: "10m",
                  labels: {
                    severity: "critical"
                  }
                },
                {
                  alert: "NodeCPUUtilizationElevated",
                  annotations: {
                    message: "Node CPU utilization is elevated.",
                    runbook_url:
                      runbookUrl + "/system.md#NodeCPUUtilizationElevated",
                    dashboard: grafanaUrl
                  },
                  expr:
                    '(\ninstance:node_cpu_utilisation:rate1m{job="node-exporter"}\n *\n instance:node_num_cpu:sum{job="node-exporter"}\n / ignoring (instance) group_left\n sum without (instance) (instance:node_num_cpu:sum{job="node-exporter"}) > .5\n)',
                  for: "10m",
                  labels: {
                    severity: "low"
                  }
                },
                {
                  alert: "NodeMemUtilizationElevated",
                  annotations: {
                    message: "Node memory utilization is elevated.",
                    runbook_url:
                      runbookUrl + "/system.md#NodeMemUtilizationElevated",
                    dashboard: grafanaUrl
                  },
                  expr:
                    '(\ninstance:node_memory_utilisation:ratio{job="node-exporter"}\n/ ignoring (instance) group_left\n count without (instance) (instance:node_memory_utilisation:ratio{job="node-exporter"})\n) > .5',
                  for: "10m",
                  labels: {
                    severity: "warn"
                  }
                },
                {
                  alert: "NodeNetworkUtilizationElevated",
                  annotations: {
                    message: "Node network RX utilization is elevated.",
                    runbook_url:
                      runbookUrl + "/system.md#NodeNetworkUtilizationElevated",
                    dashboard: grafanaUrl
                  },
                  expr:
                    'instance:node_network_receive_bytes_excluding_lo:rate1m{job="node-exporter"} > 50000000',
                  for: "10m",
                  labels: {
                    severity: "warn"
                  }
                },
                {
                  alert: "NodeNetworkUtilizationElevated",
                  annotations: {
                    message: "Node network TX utilization is elevated.",
                    runbook_url:
                      runbookUrl + "/system.md#NodeNetworkUtilizationElevated",
                    dashboard: grafanaUrl
                  },
                  expr:
                    'instance:node_network_transmit_bytes_excluding_lo:rate1m{job="node-exporter"} < -50000000',
                  for: "10m",
                  labels: {
                    severity: "warn"
                  }
                },
                {
                  alert: "NodeDiskUtilizationElevated",
                  annotations: {
                    message: "Node disk utilization is elevated.",
                    runbook_url:
                      runbookUrl + "/system.md#NodeDiskUtilizationElevated",
                    dashboard: grafanaUrl
                  },
                  expr:
                    '(\n sum without (device) (\n max without (fstype, mountpoint) (\n node_filesystem_size_bytes{job="node-exporter", } - node_filesystem_avail_bytes{job="node-exporter", }\n)\n) \n / ignoring (instance) group_left\n sum without (instance, device) (\n max without (fstype, mountpoint) (\n node_filesystem_size_bytes{job="node-exporter", }\n)\n)\n) > .5',
                  for: "10m",
                  labels: {
                    severity: "warn"
                  }
                },
                {
                  alert: "NodeDiskUtilizationSevere",
                  annotations: {
                    message: "Node disk utilization is severe.",
                    runbook_url:
                      runbookUrl + "/system.md#NodeDiskUtilizationSevere",
                    dashboard: grafanaUrl
                  },
                  expr:
                    '(\n sum without (device) (\n max without (fstype, mountpoint) (\n node_filesystem_size_bytes{job="node-exporter", } - node_filesystem_avail_bytes{job="node-exporter", }\n)\n) \n / ignoring (instance) group_left\n sum without (instance, device) (\n max without (fstype, mountpoint) (\n node_filesystem_size_bytes{job="node-exporter", }\n)\n)\n) > .8',
                  for: "10m",
                  labels: {
                    severity: "critical"
                  }
                }
              ]
            }
          ]
        }
      },
      kubeConfig
    )
  );

  return collection;
}
