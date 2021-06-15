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

export default () => [
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
        record: "instance_device:node_disk_io_time_weighted_seconds:rate1m"
      },
      {
        expr:
          'sum without (device) (\n  rate(node_network_receive_bytes_total{job="node-exporter", device!="lo"}[1m])\n)\n',
        record: "instance:node_network_receive_bytes_excluding_lo:rate1m"
      },
      {
        expr:
          'sum without (device) (\n  rate(node_network_transmit_bytes_total{job="node-exporter", device!="lo"}[1m])\n)\n',
        record: "instance:node_network_transmit_bytes_excluding_lo:rate1m"
      },
      {
        expr:
          'sum without (device) (\n  rate(node_network_receive_drop_total{job="node-exporter", device!="lo"}[1m])\n)\n',
        record: "instance:node_network_receive_drop_excluding_lo:rate1m"
      },
      {
        expr:
          'sum without (device) (\n  rate(node_network_transmit_drop_total{job="node-exporter", device!="lo"}[1m])\n)\n',
        record: "instance:node_network_transmit_drop_excluding_lo:rate1m"
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
        record: "namespace:kube_pod_container_resource_requests_cpu_cores:sum"
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
        expr: "sum(rate(node_network_receive_bytes_total[3m])) BY (instance)",
        record: "instance:node_network_receive_bytes:rate:sum"
      },
      {
        expr: "sum(rate(node_network_transmit_bytes_total[3m])) BY (instance)",
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
    name: "cortex_rules",
    rules: [
      {
        expr:
          "histogram_quantile(0.99, sum(rate(cortex_request_duration_seconds_bucket[1m])) by (le, job))",
        record: "job:cortex_request_duration_seconds:99quantile"
      },
      {
        expr:
          "histogram_quantile(0.50, sum(rate(cortex_request_duration_seconds_bucket[1m])) by (le, job))",
        record: "job:cortex_request_duration_seconds:50quantile"
      },
      {
        expr:
          "sum(rate(cortex_request_duration_seconds_sum[1m])) by (job) / sum(rate(cortex_request_duration_seconds_count[1m])) by (job)",
        record: "job:cortex_request_duration_seconds:avg"
      },
      {
        expr:
          "sum(rate(cortex_request_duration_seconds_bucket[1m])) by (le, job)",
        record: "job:cortex_request_duration_seconds_bucket:sum_rate"
      },
      {
        expr: "sum(rate(cortex_request_duration_seconds_sum[1m])) by (job)",
        record: "job:cortex_request_duration_seconds_sum:sum_rate"
      },
      {
        expr: "sum(rate(cortex_request_duration_seconds_count[1m])) by (job)",
        record: "job:cortex_request_duration_seconds_count:sum_rate"
      },
      {
        expr:
          "histogram_quantile(0.99, sum(rate(cortex_request_duration_seconds_bucket[1m])) by (le, job, route))",
        record: "job_route:cortex_request_duration_seconds:99quantile"
      },
      {
        expr:
          "histogram_quantile(0.50, sum(rate(cortex_request_duration_seconds_bucket[1m])) by (le, job, route))",
        record: "job_route:cortex_request_duration_seconds:50quantile"
      },
      {
        expr:
          "sum(rate(cortex_request_duration_seconds_sum[1m])) by (job, route) / sum(rate(cortex_request_duration_seconds_count[1m])) by (job, route)",
        record: "job_route:cortex_request_duration_seconds:avg"
      },
      {
        expr:
          "sum(rate(cortex_request_duration_seconds_bucket[1m])) by (le, job, route)",
        record: "job_route:cortex_request_duration_seconds_bucket:sum_rate"
      },
      {
        expr:
          "sum(rate(cortex_request_duration_seconds_sum[1m])) by (job, route)",
        record: "job_route:cortex_request_duration_seconds_sum:sum_rate"
      },
      {
        expr:
          "sum(rate(cortex_request_duration_seconds_count[1m])) by (job, route)",
        record: "job_route:cortex_request_duration_seconds_count:sum_rate"
      },
      {
        expr:
          "histogram_quantile(0.99, sum(rate(cortex_request_duration_seconds_bucket[1m])) by (le, namespace, job, route))",
        record: "namespace_job_route:cortex_request_duration_seconds:99quantile"
      },
      {
        expr:
          "histogram_quantile(0.50, sum(rate(cortex_request_duration_seconds_bucket[1m])) by (le, namespace, job, route))",
        record: "namespace_job_route:cortex_request_duration_seconds:50quantile"
      },
      {
        expr:
          "sum(rate(cortex_request_duration_seconds_sum[1m])) by (namespace, job, route) / sum(rate(cortex_request_duration_seconds_count[1m])) by (namespace, job, route)",
        record: "namespace_job_route:cortex_request_duration_seconds:avg"
      },
      {
        expr:
          "sum(rate(cortex_request_duration_seconds_bucket[1m])) by (le, namespace, job, route)",
        record:
          "namespace_job_route:cortex_request_duration_seconds_bucket:sum_rate"
      },
      {
        expr:
          "sum(rate(cortex_request_duration_seconds_sum[1m])) by (namespace, job, route)",
        record:
          "namespace_job_route:cortex_request_duration_seconds_sum:sum_rate"
      },
      {
        expr:
          "sum(rate(cortex_request_duration_seconds_count[1m])) by (namespace, job, route)",
        record:
          "namespace_job_route:cortex_request_duration_seconds_count:sum_rate"
      },
      {
        expr:
          "histogram_quantile(0.99, sum(rate(cortex_memcache_request_duration_seconds_bucket[1m])) by (le, job, method))",
        record: "job_method:cortex_memcache_request_duration_seconds:99quantile"
      },
      {
        expr:
          "histogram_quantile(0.50, sum(rate(cortex_memcache_request_duration_seconds_bucket[1m])) by (le, job, method))",
        record: "job_method:cortex_memcache_request_duration_seconds:50quantile"
      },
      {
        expr:
          "sum(rate(cortex_memcache_request_duration_seconds_sum[1m])) by (job, method) / sum(rate(cortex_memcache_request_duration_seconds_count[1m])) by (job, method)",
        record: "job_method:cortex_memcache_request_duration_seconds:avg"
      },
      {
        expr:
          "sum(rate(cortex_memcache_request_duration_seconds_bucket[1m])) by (le, job, method)",
        record:
          "job_method:cortex_memcache_request_duration_seconds_bucket:sum_rate"
      },
      {
        expr:
          "sum(rate(cortex_memcache_request_duration_seconds_sum[1m])) by (job, method)",
        record:
          "job_method:cortex_memcache_request_duration_seconds_sum:sum_rate"
      },
      {
        expr:
          "sum(rate(cortex_memcache_request_duration_seconds_count[1m])) by (job, method)",
        record:
          "job_method:cortex_memcache_request_duration_seconds_count:sum_rate"
      },
      {
        expr:
          "histogram_quantile(0.99, sum(rate(cortex_cache_request_duration_seconds_bucket[1m])) by (le, job))",
        record: "job:cortex_cache_request_duration_seconds:99quantile"
      },
      {
        expr:
          "histogram_quantile(0.50, sum(rate(cortex_cache_request_duration_seconds_bucket[1m])) by (le, job))",
        record: "job:cortex_cache_request_duration_seconds:50quantile"
      },
      {
        expr:
          "sum(rate(cortex_cache_request_duration_seconds_sum[1m])) by (job) / sum(rate(cortex_cache_request_duration_seconds_count[1m])) by (job)",
        record: "job:cortex_cache_request_duration_seconds:avg"
      },
      {
        expr:
          "sum(rate(cortex_cache_request_duration_seconds_bucket[1m])) by (le, job)",
        record: "job:cortex_cache_request_duration_seconds_bucket:sum_rate"
      },
      {
        expr:
          "sum(rate(cortex_cache_request_duration_seconds_sum[1m])) by (job)",
        record: "job:cortex_cache_request_duration_seconds_sum:sum_rate"
      },
      {
        expr:
          "sum(rate(cortex_cache_request_duration_seconds_count[1m])) by (job)",
        record: "job:cortex_cache_request_duration_seconds_count:sum_rate"
      },
      {
        expr:
          "histogram_quantile(0.99, sum(rate(cortex_cache_request_duration_seconds_bucket[1m])) by (le, job, method))",
        record: "job_method:cortex_cache_request_duration_seconds:99quantile"
      },
      {
        expr:
          "histogram_quantile(0.50, sum(rate(cortex_cache_request_duration_seconds_bucket[1m])) by (le, job, method))",
        record: "job_method:cortex_cache_request_duration_seconds:50quantile"
      },
      {
        expr:
          "sum(rate(cortex_cache_request_duration_seconds_sum[1m])) by (job, method) / sum(rate(cortex_cache_request_duration_seconds_count[1m])) by (job, method)",
        record: "job_method:cortex_cache_request_duration_seconds:avg"
      },
      {
        expr:
          "sum(rate(cortex_cache_request_duration_seconds_bucket[1m])) by (le, job, method)",
        record:
          "job_method:cortex_cache_request_duration_seconds_bucket:sum_rate"
      },
      {
        expr:
          "sum(rate(cortex_cache_request_duration_seconds_sum[1m])) by (job, method)",
        record: "job_method:cortex_cache_request_duration_seconds_sum:sum_rate"
      },
      {
        expr:
          "sum(rate(cortex_cache_request_duration_seconds_count[1m])) by (job, method)",
        record:
          "job_method:cortex_cache_request_duration_seconds_count:sum_rate"
      },
      {
        expr:
          "histogram_quantile(0.99, sum(rate(cortex_bigtable_request_duration_seconds_bucket[1m])) by (le, job, operation))",
        record:
          "job_operation:cortex_bigtable_request_duration_seconds:99quantile"
      },
      {
        expr:
          "histogram_quantile(0.50, sum(rate(cortex_bigtable_request_duration_seconds_bucket[1m])) by (le, job, operation))",
        record:
          "job_operation:cortex_bigtable_request_duration_seconds:50quantile"
      },
      {
        expr:
          "sum(rate(cortex_bigtable_request_duration_seconds_sum[1m])) by (job, operation) / sum(rate(cortex_bigtable_request_duration_seconds_count[1m])) by (job, operation)",
        record: "job_operation:cortex_bigtable_request_duration_seconds:avg"
      },
      {
        expr:
          "sum(rate(cortex_bigtable_request_duration_seconds_bucket[1m])) by (le, job, operation)",
        record:
          "job_operation:cortex_bigtable_request_duration_seconds_bucket:sum_rate"
      },
      {
        expr:
          "sum(rate(cortex_bigtable_request_duration_seconds_sum[1m])) by (job, operation)",
        record:
          "job_operation:cortex_bigtable_request_duration_seconds_sum:sum_rate"
      },
      {
        expr:
          "sum(rate(cortex_bigtable_request_duration_seconds_count[1m])) by (job, operation)",
        record:
          "job_operation:cortex_bigtable_request_duration_seconds_count:sum_rate"
      },
      {
        expr:
          "histogram_quantile(0.99, sum(rate(cortex_dynamo_request_duration_seconds_bucket[1m])) by (le, job, operation))",
        record:
          "job_operation:cortex_dynamo_request_duration_seconds:99quantile"
      },
      {
        expr:
          "histogram_quantile(0.50, sum(rate(cortex_dynamo_request_duration_seconds_bucket[1m])) by (le, job, operation))",
        record:
          "job_operation:cortex_dynamo_request_duration_seconds:50quantile"
      },
      {
        expr:
          "sum(rate(cortex_dynamo_request_duration_seconds_sum[1m])) by (job, operation) / sum(rate(cortex_dynamo_request_duration_seconds_count[1m])) by (job, operation)",
        record: "job_operation:cortex_dynamo_request_duration_seconds:avg"
      },
      {
        expr:
          "sum(rate(cortex_dynamo_request_duration_seconds_bucket[1m])) by (le, job, operation)",
        record:
          "job_operation:cortex_dynamo_request_duration_seconds_bucket:sum_rate"
      },
      {
        expr:
          "sum(rate(cortex_dynamo_request_duration_seconds_sum[1m])) by (job, operation)",
        record:
          "job_operation:cortex_dynamo_request_duration_seconds_sum:sum_rate"
      },
      {
        expr:
          "sum(rate(cortex_dynamo_request_duration_seconds_count[1m])) by (job, operation)",
        record:
          "job_operation:cortex_dynamo_request_duration_seconds_count:sum_rate"
      },
      {
        expr:
          "histogram_quantile(0.99, sum(rate(cortex_query_frontend_retries_bucket[1m])) by (le, job))",
        record: "job:cortex_query_frontend_retries:99quantile"
      },
      {
        expr:
          "histogram_quantile(0.50, sum(rate(cortex_query_frontend_retries_bucket[1m])) by (le, job))",
        record: "job:cortex_query_frontend_retries:50quantile"
      },
      {
        expr:
          "sum(rate(cortex_query_frontend_retries_sum[1m])) by (job) / sum(rate(cortex_query_frontend_retries_count[1m])) by (job)",
        record: "job:cortex_query_frontend_retries:avg"
      },
      {
        expr:
          "sum(rate(cortex_query_frontend_retries_bucket[1m])) by (le, job)",
        record: "job:cortex_query_frontend_retries_bucket:sum_rate"
      },
      {
        expr: "sum(rate(cortex_query_frontend_retries_sum[1m])) by (job)",
        record: "job:cortex_query_frontend_retries_sum:sum_rate"
      },
      {
        expr: "sum(rate(cortex_query_frontend_retries_count[1m])) by (job)",
        record: "job:cortex_query_frontend_retries_count:sum_rate"
      },
      {
        expr:
          "histogram_quantile(0.99, sum(rate(cortex_query_frontend_queue_duration_seconds_bucket[1m])) by (le, job))",
        record: "job:cortex_query_frontend_queue_duration_seconds:99quantile"
      },
      {
        expr:
          "histogram_quantile(0.50, sum(rate(cortex_query_frontend_queue_duration_seconds_bucket[1m])) by (le, job))",
        record: "job:cortex_query_frontend_queue_duration_seconds:50quantile"
      },
      {
        expr:
          "sum(rate(cortex_query_frontend_queue_duration_seconds_sum[1m])) by (job) / sum(rate(cortex_query_frontend_queue_duration_seconds_count[1m])) by (job)",
        record: "job:cortex_query_frontend_queue_duration_seconds:avg"
      },
      {
        expr:
          "sum(rate(cortex_query_frontend_queue_duration_seconds_bucket[1m])) by (le, job)",
        record:
          "job:cortex_query_frontend_queue_duration_seconds_bucket:sum_rate"
      },
      {
        expr:
          "sum(rate(cortex_query_frontend_queue_duration_seconds_sum[1m])) by (job)",
        record: "job:cortex_query_frontend_queue_duration_seconds_sum:sum_rate"
      },
      {
        expr:
          "sum(rate(cortex_query_frontend_queue_duration_seconds_count[1m])) by (job)",
        record:
          "job:cortex_query_frontend_queue_duration_seconds_count:sum_rate"
      },
      {
        expr:
          "histogram_quantile(0.99, sum(rate(cortex_ingester_queried_series_bucket[1m])) by (le, job))",
        record: "job:cortex_ingester_queried_series:99quantile"
      },
      {
        expr:
          "histogram_quantile(0.50, sum(rate(cortex_ingester_queried_series_bucket[1m])) by (le, job))",
        record: "job:cortex_ingester_queried_series:50quantile"
      },
      {
        expr:
          "sum(rate(cortex_ingester_queried_series_sum[1m])) by (job) / sum(rate(cortex_ingester_queried_series_count[1m])) by (job)",
        record: "job:cortex_ingester_queried_series:avg"
      },
      {
        expr:
          "sum(rate(cortex_ingester_queried_series_bucket[1m])) by (le, job)",
        record: "job:cortex_ingester_queried_series_bucket:sum_rate"
      },
      {
        expr: "sum(rate(cortex_ingester_queried_series_sum[1m])) by (job)",
        record: "job:cortex_ingester_queried_series_sum:sum_rate"
      },
      {
        expr: "sum(rate(cortex_ingester_queried_series_count[1m])) by (job)",
        record: "job:cortex_ingester_queried_series_count:sum_rate"
      },
      {
        expr:
          "histogram_quantile(0.99, sum(rate(cortex_ingester_queried_chunks_bucket[1m])) by (le, job))",
        record: "job:cortex_ingester_queried_chunks:99quantile"
      },
      {
        expr:
          "histogram_quantile(0.50, sum(rate(cortex_ingester_queried_chunks_bucket[1m])) by (le, job))",
        record: "job:cortex_ingester_queried_chunks:50quantile"
      },
      {
        expr:
          "sum(rate(cortex_ingester_queried_chunks_sum[1m])) by (job) / sum(rate(cortex_ingester_queried_chunks_count[1m])) by (job)",
        record: "job:cortex_ingester_queried_chunks:avg"
      },
      {
        expr:
          "sum(rate(cortex_ingester_queried_chunks_bucket[1m])) by (le, job)",
        record: "job:cortex_ingester_queried_chunks_bucket:sum_rate"
      },
      {
        expr: "sum(rate(cortex_ingester_queried_chunks_sum[1m])) by (job)",
        record: "job:cortex_ingester_queried_chunks_sum:sum_rate"
      },
      {
        expr: "sum(rate(cortex_ingester_queried_chunks_count[1m])) by (job)",
        record: "job:cortex_ingester_queried_chunks_count:sum_rate"
      },
      {
        expr:
          "histogram_quantile(0.99, sum(rate(cortex_ingester_queried_samples_bucket[1m])) by (le, job))",
        record: "job:cortex_ingester_queried_samples:99quantile"
      },
      {
        expr:
          "histogram_quantile(0.50, sum(rate(cortex_ingester_queried_samples_bucket[1m])) by (le, job))",
        record: "job:cortex_ingester_queried_samples:50quantile"
      },
      {
        expr:
          "sum(rate(cortex_ingester_queried_samples_sum[1m])) by (job) / sum(rate(cortex_ingester_queried_samples_count[1m])) by (job)",
        record: "job:cortex_ingester_queried_samples:avg"
      },
      {
        expr:
          "sum(rate(cortex_ingester_queried_samples_bucket[1m])) by (le, job)",
        record: "job:cortex_ingester_queried_samples_bucket:sum_rate"
      },
      {
        expr: "sum(rate(cortex_ingester_queried_samples_sum[1m])) by (job)",
        record: "job:cortex_ingester_queried_samples_sum:sum_rate"
      },
      {
        expr: "sum(rate(cortex_ingester_queried_samples_count[1m])) by (job)",
        record: "job:cortex_ingester_queried_samples_count:sum_rate"
      },
      {
        expr:
          "histogram_quantile(0.99, sum(rate(cortex_chunk_store_index_lookups_per_query_bucket[1m])) by (le, job))",
        record: "job:cortex_chunk_store_index_lookups_per_query:99quantile"
      },
      {
        expr:
          "histogram_quantile(0.50, sum(rate(cortex_chunk_store_index_lookups_per_query_bucket[1m])) by (le, job))",
        record: "job:cortex_chunk_store_index_lookups_per_query:50quantile"
      },
      {
        expr:
          "sum(rate(cortex_chunk_store_index_lookups_per_query_sum[1m])) by (job) / sum(rate(cortex_chunk_store_index_lookups_per_query_count[1m])) by (job)",
        record: "job:cortex_chunk_store_index_lookups_per_query:avg"
      },
      {
        expr:
          "sum(rate(cortex_chunk_store_index_lookups_per_query_bucket[1m])) by (le, job)",
        record: "job:cortex_chunk_store_index_lookups_per_query_bucket:sum_rate"
      },
      {
        expr:
          "sum(rate(cortex_chunk_store_index_lookups_per_query_sum[1m])) by (job)",
        record: "job:cortex_chunk_store_index_lookups_per_query_sum:sum_rate"
      },
      {
        expr:
          "sum(rate(cortex_chunk_store_index_lookups_per_query_count[1m])) by (job)",
        record: "job:cortex_chunk_store_index_lookups_per_query_count:sum_rate"
      },
      {
        expr:
          "histogram_quantile(0.99, sum(rate(cortex_chunk_store_series_pre_intersection_per_query_bucket[1m])) by (le, job))",
        record:
          "job:cortex_chunk_store_series_pre_intersection_per_query:99quantile"
      },
      {
        expr:
          "histogram_quantile(0.50, sum(rate(cortex_chunk_store_series_pre_intersection_per_query_bucket[1m])) by (le, job))",
        record:
          "job:cortex_chunk_store_series_pre_intersection_per_query:50quantile"
      },
      {
        expr:
          "sum(rate(cortex_chunk_store_series_pre_intersection_per_query_sum[1m])) by (job) / sum(rate(cortex_chunk_store_series_pre_intersection_per_query_count[1m])) by (job)",
        record: "job:cortex_chunk_store_series_pre_intersection_per_query:avg"
      },
      {
        expr:
          "sum(rate(cortex_chunk_store_series_pre_intersection_per_query_bucket[1m])) by (le, job)",
        record:
          "job:cortex_chunk_store_series_pre_intersection_per_query_bucket:sum_rate"
      },
      {
        expr:
          "sum(rate(cortex_chunk_store_series_pre_intersection_per_query_sum[1m])) by (job)",
        record:
          "job:cortex_chunk_store_series_pre_intersection_per_query_sum:sum_rate"
      },
      {
        expr:
          "sum(rate(cortex_chunk_store_series_pre_intersection_per_query_count[1m])) by (job)",
        record:
          "job:cortex_chunk_store_series_pre_intersection_per_query_count:sum_rate"
      },
      {
        expr:
          "histogram_quantile(0.99, sum(rate(cortex_chunk_store_series_post_intersection_per_query_bucket[1m])) by (le, job))",
        record:
          "job:cortex_chunk_store_series_post_intersection_per_query:99quantile"
      },
      {
        expr:
          "histogram_quantile(0.50, sum(rate(cortex_chunk_store_series_post_intersection_per_query_bucket[1m])) by (le, job))",
        record:
          "job:cortex_chunk_store_series_post_intersection_per_query:50quantile"
      },
      {
        expr:
          "sum(rate(cortex_chunk_store_series_post_intersection_per_query_sum[1m])) by (job) / sum(rate(cortex_chunk_store_series_post_intersection_per_query_count[1m])) by (job)",
        record: "job:cortex_chunk_store_series_post_intersection_per_query:avg"
      },
      {
        expr:
          "sum(rate(cortex_chunk_store_series_post_intersection_per_query_bucket[1m])) by (le, job)",
        record:
          "job:cortex_chunk_store_series_post_intersection_per_query_bucket:sum_rate"
      },
      {
        expr:
          "sum(rate(cortex_chunk_store_series_post_intersection_per_query_sum[1m])) by (job)",
        record:
          "job:cortex_chunk_store_series_post_intersection_per_query_sum:sum_rate"
      },
      {
        expr:
          "sum(rate(cortex_chunk_store_series_post_intersection_per_query_count[1m])) by (job)",
        record:
          "job:cortex_chunk_store_series_post_intersection_per_query_count:sum_rate"
      },
      {
        expr:
          "histogram_quantile(0.99, sum(rate(cortex_chunk_store_chunks_per_query_bucket[1m])) by (le, job))",
        record: "job:cortex_chunk_store_chunks_per_query:99quantile"
      },
      {
        expr:
          "histogram_quantile(0.50, sum(rate(cortex_chunk_store_chunks_per_query_bucket[1m])) by (le, job))",
        record: "job:cortex_chunk_store_chunks_per_query:50quantile"
      },
      {
        expr:
          "sum(rate(cortex_chunk_store_chunks_per_query_sum[1m])) by (job) / sum(rate(cortex_chunk_store_chunks_per_query_count[1m])) by (job)",
        record: "job:cortex_chunk_store_chunks_per_query:avg"
      },
      {
        expr:
          "sum(rate(cortex_chunk_store_chunks_per_query_bucket[1m])) by (le, job)",
        record: "job:cortex_chunk_store_chunks_per_query_bucket:sum_rate"
      },
      {
        expr: "sum(rate(cortex_chunk_store_chunks_per_query_sum[1m])) by (job)",
        record: "job:cortex_chunk_store_chunks_per_query_sum:sum_rate"
      },
      {
        expr:
          "sum(rate(cortex_chunk_store_chunks_per_query_count[1m])) by (job)",
        record: "job:cortex_chunk_store_chunks_per_query_count:sum_rate"
      },
      {
        expr:
          "histogram_quantile(0.99, sum(rate(cortex_database_request_duration_seconds_bucket[1m])) by (le, job, method))",
        record: "job_method:cortex_database_request_duration_seconds:99quantile"
      },
      {
        expr:
          "histogram_quantile(0.50, sum(rate(cortex_database_request_duration_seconds_bucket[1m])) by (le, job, method))",
        record: "job_method:cortex_database_request_duration_seconds:50quantile"
      },
      {
        expr:
          "sum(rate(cortex_database_request_duration_seconds_sum[1m])) by (job, method) / sum(rate(cortex_database_request_duration_seconds_count[1m])) by (job, method)",
        record: "job_method:cortex_database_request_duration_seconds:avg"
      },
      {
        expr:
          "sum(rate(cortex_database_request_duration_seconds_bucket[1m])) by (le, job, method)",
        record:
          "job_method:cortex_database_request_duration_seconds_bucket:sum_rate"
      },
      {
        expr:
          "sum(rate(cortex_database_request_duration_seconds_sum[1m])) by (job, method)",
        record:
          "job_method:cortex_database_request_duration_seconds_sum:sum_rate"
      },
      {
        expr:
          "sum(rate(cortex_database_request_duration_seconds_count[1m])) by (job, method)",
        record:
          "job_method:cortex_database_request_duration_seconds_count:sum_rate"
      },
      {
        expr:
          "histogram_quantile(0.99, sum(rate(cortex_gcs_request_duration_seconds_bucket[1m])) by (le, job, operation))",
        record: "job_operation:cortex_gcs_request_duration_seconds:99quantile"
      },
      {
        expr:
          "histogram_quantile(0.50, sum(rate(cortex_gcs_request_duration_seconds_bucket[1m])) by (le, job, operation))",
        record: "job_operation:cortex_gcs_request_duration_seconds:50quantile"
      },
      {
        expr:
          "sum(rate(cortex_gcs_request_duration_seconds_sum[1m])) by (job, operation) / sum(rate(cortex_gcs_request_duration_seconds_count[1m])) by (job, operation)",
        record: "job_operation:cortex_gcs_request_duration_seconds:avg"
      },
      {
        expr:
          "sum(rate(cortex_gcs_request_duration_seconds_bucket[1m])) by (le, job, operation)",
        record:
          "job_operation:cortex_gcs_request_duration_seconds_bucket:sum_rate"
      },
      {
        expr:
          "sum(rate(cortex_gcs_request_duration_seconds_sum[1m])) by (job, operation)",
        record: "job_operation:cortex_gcs_request_duration_seconds_sum:sum_rate"
      },
      {
        expr:
          "sum(rate(cortex_gcs_request_duration_seconds_count[1m])) by (job, operation)",
        record:
          "job_operation:cortex_gcs_request_duration_seconds_count:sum_rate"
      },
      {
        expr:
          "histogram_quantile(0.99, sum(rate(cortex_kv_request_duration_seconds_bucket[1m])) by (le, job))",
        record: "job:cortex_kv_request_duration_seconds:99quantile"
      },
      {
        expr:
          "histogram_quantile(0.50, sum(rate(cortex_kv_request_duration_seconds_bucket[1m])) by (le, job))",
        record: "job:cortex_kv_request_duration_seconds:50quantile"
      },
      {
        expr:
          "sum(rate(cortex_kv_request_duration_seconds_sum[1m])) by (job) / sum(rate(cortex_kv_request_duration_seconds_count[1m])) by (job)",
        record: "job:cortex_kv_request_duration_seconds:avg"
      },
      {
        expr:
          "sum(rate(cortex_kv_request_duration_seconds_bucket[1m])) by (le, job)",
        record: "job:cortex_kv_request_duration_seconds_bucket:sum_rate"
      },
      {
        expr: "sum(rate(cortex_kv_request_duration_seconds_sum[1m])) by (job)",
        record: "job:cortex_kv_request_duration_seconds_sum:sum_rate"
      },
      {
        expr:
          "sum(rate(cortex_kv_request_duration_seconds_count[1m])) by (job)",
        record: "job:cortex_kv_request_duration_seconds_count:sum_rate"
      }
    ]
  },
  {
    name: "frontend_rules",
    rules: [
      {
        expr:
          "histogram_quantile(0.99, sum(rate(tsdb_gw_request_duration_seconds_bucket[1m])) by (le, job))",
        record: "job:tsdb_gw_request_duration_seconds:99quantile"
      },
      {
        expr:
          "histogram_quantile(0.50, sum(rate(tsdb_gw_request_duration_seconds_bucket[1m])) by (le, job))",
        record: "job:tsdb_gw_request_duration_seconds:50quantile"
      },
      {
        expr:
          "sum(rate(tsdb_gw_request_duration_seconds_sum[1m])) by (job) / sum(rate(tsdb_gw_request_duration_seconds_count[1m])) by (job)",
        record: "job:tsdb_gw_request_duration_seconds:avg"
      },
      {
        expr:
          "sum(rate(tsdb_gw_request_duration_seconds_bucket[1m])) by (le, job)",
        record: "job:tsdb_gw_request_duration_seconds_bucket:sum_rate"
      },
      {
        expr: "sum(rate(tsdb_gw_request_duration_seconds_sum[1m])) by (job)",
        record: "job:tsdb_gw_request_duration_seconds_sum:sum_rate"
      },
      {
        expr: "sum(rate(tsdb_gw_request_duration_seconds_count[1m])) by (job)",
        record: "job:tsdb_gw_request_duration_seconds_count:sum_rate"
      },
      {
        expr:
          "histogram_quantile(0.99, sum(rate(tsdb_gw_request_duration_seconds_bucket[1m])) by (le, job, route))",
        record: "job_route:tsdb_gw_request_duration_seconds:99quantile"
      },
      {
        expr:
          "histogram_quantile(0.50, sum(rate(tsdb_gw_request_duration_seconds_bucket[1m])) by (le, job, route))",
        record: "job_route:tsdb_gw_request_duration_seconds:50quantile"
      },
      {
        expr:
          "sum(rate(tsdb_gw_request_duration_seconds_sum[1m])) by (job, route) / sum(rate(tsdb_gw_request_duration_seconds_count[1m])) by (job, route)",
        record: "job_route:tsdb_gw_request_duration_seconds:avg"
      },
      {
        expr:
          "sum(rate(tsdb_gw_request_duration_seconds_bucket[1m])) by (le, job, route)",
        record: "job_route:tsdb_gw_request_duration_seconds_bucket:sum_rate"
      },
      {
        expr:
          "sum(rate(tsdb_gw_request_duration_seconds_sum[1m])) by (job, route)",
        record: "job_route:tsdb_gw_request_duration_seconds_sum:sum_rate"
      },
      {
        expr:
          "sum(rate(tsdb_gw_request_duration_seconds_count[1m])) by (job, route)",
        record: "job_route:tsdb_gw_request_duration_seconds_count:sum_rate"
      },
      {
        expr:
          "histogram_quantile(0.99, sum(rate(tsdb_gw_request_duration_seconds_bucket[1m])) by (le, namespace, job, route))",
        record:
          "namespace_job_route:tsdb_gw_request_duration_seconds:99quantile"
      },
      {
        expr:
          "histogram_quantile(0.50, sum(rate(tsdb_gw_request_duration_seconds_bucket[1m])) by (le, namespace, job, route))",
        record:
          "namespace_job_route:tsdb_gw_request_duration_seconds:50quantile"
      },
      {
        expr:
          "sum(rate(tsdb_gw_request_duration_seconds_sum[1m])) by (namespace, job, route) / sum(rate(tsdb_gw_request_duration_seconds_count[1m])) by (namespace, job, route)",
        record: "namespace_job_route:tsdb_gw_request_duration_seconds:avg"
      },
      {
        expr:
          "sum(rate(tsdb_gw_request_duration_seconds_bucket[1m])) by (le, namespace, job, route)",
        record:
          "namespace_job_route:tsdb_gw_request_duration_seconds_bucket:sum_rate"
      },
      {
        expr:
          "sum(rate(tsdb_gw_request_duration_seconds_sum[1m])) by (namespace, job, route)",
        record:
          "namespace_job_route:tsdb_gw_request_duration_seconds_sum:sum_rate"
      },
      {
        expr:
          "sum(rate(tsdb_gw_request_duration_seconds_count[1m])) by (namespace, job, route)",
        record:
          "namespace_job_route:tsdb_gw_request_duration_seconds_count:sum_rate"
      },
      {
        expr:
          "histogram_quantile(0.99, sum(rate(cortex_gw_request_duration_seconds_bucket[1m])) by (le, job))",
        record: "job:cortex_gw_request_duration_seconds:99quantile"
      },
      {
        expr:
          "histogram_quantile(0.50, sum(rate(cortex_gw_request_duration_seconds_bucket[1m])) by (le, job))",
        record: "job:cortex_gw_request_duration_seconds:50quantile"
      },
      {
        expr:
          "sum(rate(cortex_gw_request_duration_seconds_sum[1m])) by (job) / sum(rate(cortex_gw_request_duration_seconds_count[1m])) by (job)",
        record: "job:cortex_gw_request_duration_seconds:avg"
      },
      {
        expr:
          "sum(rate(cortex_gw_request_duration_seconds_bucket[1m])) by (le, job)",
        record: "job:cortex_gw_request_duration_seconds_bucket:sum_rate"
      },
      {
        expr: "sum(rate(cortex_gw_request_duration_seconds_sum[1m])) by (job)",
        record: "job:cortex_gw_request_duration_seconds_sum:sum_rate"
      },
      {
        expr:
          "sum(rate(cortex_gw_request_duration_seconds_count[1m])) by (job)",
        record: "job:cortex_gw_request_duration_seconds_count:sum_rate"
      },
      {
        expr:
          "histogram_quantile(0.99, sum(rate(cortex_gw_request_duration_seconds_bucket[1m])) by (le, job, route))",
        record: "job_route:cortex_gw_request_duration_seconds:99quantile"
      },
      {
        expr:
          "histogram_quantile(0.50, sum(rate(cortex_gw_request_duration_seconds_bucket[1m])) by (le, job, route))",
        record: "job_route:cortex_gw_request_duration_seconds:50quantile"
      },
      {
        expr:
          "sum(rate(cortex_gw_request_duration_seconds_sum[1m])) by (job, route) / sum(rate(cortex_gw_request_duration_seconds_count[1m])) by (job, route)",
        record: "job_route:cortex_gw_request_duration_seconds:avg"
      },
      {
        expr:
          "sum(rate(cortex_gw_request_duration_seconds_bucket[1m])) by (le, job, route)",
        record: "job_route:cortex_gw_request_duration_seconds_bucket:sum_rate"
      },
      {
        expr:
          "sum(rate(cortex_gw_request_duration_seconds_sum[1m])) by (job, route)",
        record: "job_route:cortex_gw_request_duration_seconds_sum:sum_rate"
      },
      {
        expr:
          "sum(rate(cortex_gw_request_duration_seconds_count[1m])) by (job, route)",
        record: "job_route:cortex_gw_request_duration_seconds_count:sum_rate"
      },
      {
        expr:
          "histogram_quantile(0.99, sum(rate(cortex_gw_request_duration_seconds_bucket[1m])) by (le, namespace, job, route))",
        record:
          "namespace_job_route:cortex_gw_request_duration_seconds:99quantile"
      },
      {
        expr:
          "histogram_quantile(0.50, sum(rate(cortex_gw_request_duration_seconds_bucket[1m])) by (le, namespace, job, route))",
        record:
          "namespace_job_route:cortex_gw_request_duration_seconds:50quantile"
      },
      {
        expr:
          "sum(rate(cortex_gw_request_duration_seconds_sum[1m])) by (namespace, job, route) / sum(rate(cortex_gw_request_duration_seconds_count[1m])) by (namespace, job, route)",
        record: "namespace_job_route:cortex_gw_request_duration_seconds:avg"
      },
      {
        expr:
          "sum(rate(cortex_gw_request_duration_seconds_bucket[1m])) by (le, namespace, job, route)",
        record:
          "namespace_job_route:cortex_gw_request_duration_seconds_bucket:sum_rate"
      },
      {
        expr:
          "sum(rate(cortex_gw_request_duration_seconds_sum[1m])) by (namespace, job, route)",
        record:
          "namespace_job_route:cortex_gw_request_duration_seconds_sum:sum_rate"
      },
      {
        expr:
          "sum(rate(cortex_gw_request_duration_seconds_count[1m])) by (namespace, job, route)",
        record:
          "namespace_job_route:cortex_gw_request_duration_seconds_count:sum_rate"
      }
    ]
  },
  {
    name: "cortex_slo_rules",
    rules: [
      {
        expr:
          '1 -\n(\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_bucket{status_code!~"5..", le="1", route="api_v1_push", job=~".*.cortex-api"}[5m]))\n/\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_count{route="api_v1_push", job=~".*.cortex-api"}[5m]))\n)\n',
        record:
          "namespace_job:cortex_gateway_write_slo_errors_per_request:ratio_rate5m"
      },
      {
        expr:
          '1 -\n(\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_bucket{status_code!~"5..", le="1", route="api_v1_push", job=~".*.cortex-api"}[30m]))\n/\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_count{route="api_v1_push", job=~".*.cortex-api"}[30m]))\n)\n',
        record:
          "namespace_job:cortex_gateway_write_slo_errors_per_request:ratio_rate30m"
      },
      {
        expr:
          '1 -\n(\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_bucket{status_code!~"5..", le="1", route="api_v1_push", job=~".*.cortex-api"}[1h]))\n/\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_count{route="api_v1_push", job=~".*.cortex-api"}[1h]))\n)\n',
        record:
          "namespace_job:cortex_gateway_write_slo_errors_per_request:ratio_rate1h"
      },
      {
        expr:
          '1 -\n(\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_bucket{status_code!~"5..", le="1", route="api_v1_push", job=~".*.cortex-api"}[2h]))\n/\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_count{route="api_v1_push", job=~".*.cortex-api"}[2h]))\n)\n',
        record:
          "namespace_job:cortex_gateway_write_slo_errors_per_request:ratio_rate2h"
      },
      {
        expr:
          '1 -\n(\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_bucket{status_code!~"5..", le="1", route="api_v1_push", job=~".*.cortex-api"}[6h]))\n/\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_count{route="api_v1_push", job=~".*.cortex-api"}[6h]))\n)\n',
        record:
          "namespace_job:cortex_gateway_write_slo_errors_per_request:ratio_rate6h"
      },
      {
        expr:
          '1 -\n(\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_bucket{status_code!~"5..", le="1", route="api_v1_push", job=~".*.cortex-api"}[1d]))\n/\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_count{route="api_v1_push", job=~".*.cortex-api"}[1d]))\n)\n',
        record:
          "namespace_job:cortex_gateway_write_slo_errors_per_request:ratio_rate1d"
      },
      {
        expr:
          '1 -\n(\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_bucket{status_code!~"5..", le="1", route="api_v1_push", job=~".*.cortex-api"}[3d]))\n/\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_count{route="api_v1_push", job=~".*.cortex-api"}[3d]))\n)\n',
        record:
          "namespace_job:cortex_gateway_write_slo_errors_per_request:ratio_rate3d"
      },
      {
        expr:
          '1 -\n(\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_bucket{status_code!~"5..",le="2.5",route=~"api_v1_query.*", job=~".*.cortex-api"}[5m]))\n/\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_count{route=~"api_v1_query.*", job=~".*.cortex-api"}[5m]))\n)\n',
        record:
          "namespace_job:cortex_gateway_read_slo_errors_per_request:ratio_rate5m"
      },
      {
        expr:
          '1 -\n(\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_bucket{status_code!~"5..",le="2.5",route=~"api_v1_query.*", job=~".*.cortex-api"}[30m]))\n/\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_count{route=~"api_v1_query.*", job=~".*.cortex-api"}[30m]))\n)\n',
        record:
          "namespace_job:cortex_gateway_read_slo_errors_per_request:ratio_rate30m"
      },
      {
        expr:
          '1 -\n(\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_bucket{status_code!~"5..",le="2.5",route=~"api_v1_query.*", job=~".*.cortex-api"}[1h]))\n/\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_count{route=~"api_v1_query.*", job=~".*.cortex-api"}[1h]))\n)\n',
        record:
          "namespace_job:cortex_gateway_read_slo_errors_per_request:ratio_rate1h"
      },
      {
        expr:
          '1 -\n(\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_bucket{status_code!~"5..",le="2.5",route=~"api_v1_query.*", job=~".*.cortex-api"}[2h]))\n/\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_count{route=~"api_v1_query.*", job=~".*.cortex-api"}[2h]))\n)\n',
        record:
          "namespace_job:cortex_gateway_read_slo_errors_per_request:ratio_rate2h"
      },
      {
        expr:
          '1 -\n(\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_bucket{status_code!~"5..",le="2.5",route=~"api_v1_query.*", job=~".*.cortex-api"}[6h]))\n/\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_count{route=~"api_v1_query.*", job=~".*.cortex-api"}[6h]))\n)\n',
        record:
          "namespace_job:cortex_gateway_read_slo_errors_per_request:ratio_rate6h"
      },
      {
        expr:
          '1 -\n(\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_bucket{status_code!~"5..",le="2.5",route=~"api_v1_query.*", job=~".*.cortex-api"}[1d]))\n/\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_count{route=~"api_v1_query.*", job=~".*.cortex-api"}[1d]))\n)\n',
        record:
          "namespace_job:cortex_gateway_read_slo_errors_per_request:ratio_rate1d"
      },
      {
        expr:
          '1 -\n(\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_bucket{status_code!~"5..",le="2.5",route=~"api_v1_query.*", job=~".*.cortex-api"}[3d]))\n/\n  sum by (namespace, job) (rate(cortex_request_duration_seconds_count{route=~"api_v1_query.*", job=~".*.cortex-api"}[3d]))\n)\n',
        record:
          "namespace_job:cortex_gateway_read_slo_errors_per_request:ratio_rate3d"
      },
      {
        expr:
          '1 -\n(\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_bucket{status_code!~"error|5..",le="1",route="cortex-write"}[5m]))\n/\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_count{route="cortex-write"}[5m]))\n)\n',
        record:
          "namespace_job:cortex_gw_write_slo_errors_per_request:ratio_rate5m"
      },
      {
        expr:
          '1 -\n(\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_bucket{status_code!~"error|5..",le="1",route="cortex-write"}[30m]))\n/\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_count{route="cortex-write"}[30m]))\n)\n',
        record:
          "namespace_job:cortex_gw_write_slo_errors_per_request:ratio_rate30m"
      },
      {
        expr:
          '1 -\n(\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_bucket{status_code!~"error|5..",le="1",route="cortex-write"}[1h]))\n/\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_count{route="cortex-write"}[1h]))\n)\n',
        record:
          "namespace_job:cortex_gw_write_slo_errors_per_request:ratio_rate1h"
      },
      {
        expr:
          '1 -\n(\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_bucket{status_code!~"error|5..",le="1",route="cortex-write"}[2h]))\n/\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_count{route="cortex-write"}[2h]))\n)\n',
        record:
          "namespace_job:cortex_gw_write_slo_errors_per_request:ratio_rate2h"
      },
      {
        expr:
          '1 -\n(\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_bucket{status_code!~"error|5..",le="1",route="cortex-write"}[6h]))\n/\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_count{route="cortex-write"}[6h]))\n)\n',
        record:
          "namespace_job:cortex_gw_write_slo_errors_per_request:ratio_rate6h"
      },
      {
        expr:
          '1 -\n(\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_bucket{status_code!~"error|5..",le="1",route="cortex-write"}[1d]))\n/\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_count{route="cortex-write"}[1d]))\n)\n',
        record:
          "namespace_job:cortex_gw_write_slo_errors_per_request:ratio_rate1d"
      },
      {
        expr:
          '1 -\n(\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_bucket{status_code!~"error|5..",le="1",route="cortex-write"}[3d]))\n/\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_count{route="cortex-write"}[3d]))\n)\n',
        record:
          "namespace_job:cortex_gw_write_slo_errors_per_request:ratio_rate3d"
      },
      {
        expr:
          '1 -\n(\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_bucket{status_code!~"error|5..",le="2.5",route="cortex-read"}[5m]))\n/\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_count{route="cortex-read"}[5m]))\n)\n',
        record:
          "namespace_job:cortex_gw_read_slo_errors_per_request:ratio_rate5m"
      },
      {
        expr:
          '1 -\n(\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_bucket{status_code!~"error|5..",le="2.5",route="cortex-read"}[30m]))\n/\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_count{route="cortex-read"}[30m]))\n)\n',
        record:
          "namespace_job:cortex_gw_read_slo_errors_per_request:ratio_rate30m"
      },
      {
        expr:
          '1 -\n(\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_bucket{status_code!~"error|5..",le="2.5",route="cortex-read"}[1h]))\n/\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_count{route="cortex-read"}[1h]))\n)\n',
        record:
          "namespace_job:cortex_gw_read_slo_errors_per_request:ratio_rate1h"
      },
      {
        expr:
          '1 -\n(\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_bucket{status_code!~"error|5..",le="2.5",route="cortex-read"}[2h]))\n/\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_count{route="cortex-read"}[2h]))\n)\n',
        record:
          "namespace_job:cortex_gw_read_slo_errors_per_request:ratio_rate2h"
      },
      {
        expr:
          '1 -\n(\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_bucket{status_code!~"error|5..",le="2.5",route="cortex-read"}[6h]))\n/\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_count{route="cortex-read"}[6h]))\n)\n',
        record:
          "namespace_job:cortex_gw_read_slo_errors_per_request:ratio_rate6h"
      },
      {
        expr:
          '1 -\n(\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_bucket{status_code!~"error|5..",le="2.5",route="cortex-read"}[1d]))\n/\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_count{route="cortex-read"}[1d]))\n)\n',
        record:
          "namespace_job:cortex_gw_read_slo_errors_per_request:ratio_rate1d"
      },
      {
        expr:
          '1 -\n(\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_bucket{status_code!~"error|5..",le="2.5",route="cortex-read"}[3d]))\n/\n  sum by (namespace, job) (rate(cortex_gw_request_duration_seconds_count{route="cortex-read"}[3d]))\n)\n',
        record:
          "namespace_job:cortex_gw_read_slo_errors_per_request:ratio_rate3d"
      }
    ]
  },
  {
    name: "cortex_received_samples",
    rules: [
      {
        expr:
          'sum by (namespace) (rate(cortex_distributor_received_samples_total{job=~".*.distributor"}[5m]))\n',
        record: "namespace:cortex_distributor_received_samples:rate5m"
      }
    ]
  },
  {
    name: "loki_rules",
    rules: [
      {
        expr:
          "histogram_quantile(0.99, sum(rate(loki_request_duration_seconds_bucket[1m])) by (le, job))",
        record: "job:loki_request_duration_seconds:99quantile"
      },
      {
        expr:
          "histogram_quantile(0.50, sum(rate(loki_request_duration_seconds_bucket[1m])) by (le, job))",
        record: "job:loki_request_duration_seconds:50quantile"
      },
      {
        expr:
          "sum(rate(loki_request_duration_seconds_sum[1m])) by (job) / sum(rate(loki_request_duration_seconds_count[1m])) by (job)",
        record: "job:loki_request_duration_seconds:avg"
      },
      {
        expr:
          "sum(rate(loki_request_duration_seconds_bucket[1m])) by (le, job)",
        record: "job:loki_request_duration_seconds_bucket:sum_rate"
      },
      {
        expr: "sum(rate(loki_request_duration_seconds_sum[1m])) by (job)",
        record: "job:loki_request_duration_seconds_sum:sum_rate"
      },
      {
        expr: "sum(rate(loki_request_duration_seconds_count[1m])) by (job)",
        record: "job:loki_request_duration_seconds_count:sum_rate"
      },
      {
        expr:
          "histogram_quantile(0.99, sum(rate(loki_request_duration_seconds_bucket[1m])) by (le, job, route))",
        record: "job_route:loki_request_duration_seconds:99quantile"
      },
      {
        expr:
          "histogram_quantile(0.50, sum(rate(loki_request_duration_seconds_bucket[1m])) by (le, job, route))",
        record: "job_route:loki_request_duration_seconds:50quantile"
      },
      {
        expr:
          "sum(rate(loki_request_duration_seconds_sum[1m])) by (job, route) / sum(rate(loki_request_duration_seconds_count[1m])) by (job, route)",
        record: "job_route:loki_request_duration_seconds:avg"
      },
      {
        expr:
          "sum(rate(loki_request_duration_seconds_bucket[1m])) by (le, job, route)",
        record: "job_route:loki_request_duration_seconds_bucket:sum_rate"
      },
      {
        expr:
          "sum(rate(loki_request_duration_seconds_sum[1m])) by (job, route)",
        record: "job_route:loki_request_duration_seconds_sum:sum_rate"
      },
      {
        expr:
          "sum(rate(loki_request_duration_seconds_count[1m])) by (job, route)",
        record: "job_route:loki_request_duration_seconds_count:sum_rate"
      },
      {
        expr:
          "histogram_quantile(0.99, sum(rate(loki_request_duration_seconds_bucket[1m])) by (le, namespace, job, route))",
        record: "namespace_job_route:loki_request_duration_seconds:99quantile"
      },
      {
        expr:
          "histogram_quantile(0.50, sum(rate(loki_request_duration_seconds_bucket[1m])) by (le, namespace, job, route))",
        record: "namespace_job_route:loki_request_duration_seconds:50quantile"
      },
      {
        expr:
          "sum(rate(loki_request_duration_seconds_sum[1m])) by (namespace, job, route) / sum(rate(loki_request_duration_seconds_count[1m])) by (namespace, job, route)",
        record: "namespace_job_route:loki_request_duration_seconds:avg"
      },
      {
        expr:
          "sum(rate(loki_request_duration_seconds_bucket[1m])) by (le, namespace, job, route)",
        record:
          "namespace_job_route:loki_request_duration_seconds_bucket:sum_rate"
      },
      {
        expr:
          "sum(rate(loki_request_duration_seconds_sum[1m])) by (namespace, job, route)",
        record: "namespace_job_route:loki_request_duration_seconds_sum:sum_rate"
      },
      {
        expr:
          "sum(rate(loki_request_duration_seconds_count[1m])) by (namespace, job, route)",
        record:
          "namespace_job_route:loki_request_duration_seconds_count:sum_rate"
      }
    ]
  }
];
