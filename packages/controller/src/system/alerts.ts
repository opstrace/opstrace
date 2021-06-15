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

export default (runbookUrl: string, grafanaUrl: string) => [
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
          summary: "Network interface is reporting many receive errors."
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
          summary: "Network interface is reporting many transmit errors."
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
        alert: "KubeAPIDown",
        annotations: {
          message: "KubeAPI has disappeared from Prometheus target discovery.",
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
          message: "Kubelet has disappeared from Prometheus target discovery.",
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
        expr: 'kube_job_status_failed{job="kube-state-metrics"}  > 0\n',
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
          message: "{{ $labels.node }} has been unready for more than an hour.",
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
        expr: 'kubelet_running_pod_count{job="kubelet"} > 110 * 0.9\n',
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
          message: "{{ $value }}% of the {{ $labels.job }} targets are down."
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
        expr: 'abs(node_timex_offset_seconds{job="node-exporter"}) > 0.05\n',
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
    name: "opstrace-system",
    rules: [
      {
        alert: "NodeCPUUtilizationSevere",
        annotations: {
          message: "Node CPU utilization is severe.",
          runbook_url: runbookUrl + "/system.md#NodeCPUUtilizationSevere",
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
          runbook_url: runbookUrl + "/system.md#NodeCPUUtilizationElevated",
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
          runbook_url: runbookUrl + "/system.md#NodeMemUtilizationElevated",
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
          runbook_url: runbookUrl + "/system.md#NodeNetworkUtilizationElevated",
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
          runbook_url: runbookUrl + "/system.md#NodeNetworkUtilizationElevated",
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
          runbook_url: runbookUrl + "/system.md#NodeDiskUtilizationElevated",
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
          runbook_url: runbookUrl + "/system.md#NodeDiskUtilizationSevere",
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
  },
  {
    name: "cortex_alerts",
    rules: [
      {
        alert: "CortexIngesterUnhealthy",
        annotations: {
          message:
            "{{ $labels.job }} reports more than one unhealthy ingester.",
          runbook_url: runbookUrl + "/cortex.md#CortexIngesterUnhealthy"
        },
        expr:
          'min(cortex_ring_members{state="Unhealthy", job=~"[a-z].+distributor"}) by (namespace, job) > 0\n',
        for: "15m",
        labels: {
          severity: "critical"
        }
      },
      {
        alert: "CortexFlushStuck",
        annotations: {
          message:
            "{{ $labels.job }}/{{ $labels.instance }} is stuck flushing chunks.",
          runbook_url: runbookUrl + "/cortex.md#CortexFlushStuck"
        },
        expr:
          "(cortex_ingester_memory_chunks / cortex_ingester_memory_series) > 1.3\n",
        for: "15m",
        labels: {
          severity: "critical"
        }
      },
      {
        alert: "CortexRequestErrors",
        annotations: {
          message:
            '{{ $labels.job }} {{ $labels.route }} is experiencing {{ printf "%.2f" $value }}% errors.\n',
          runbook_url: runbookUrl + "/cortex.md#CortexRequestErrors"
        },
        expr:
          '100 * sum(rate(cortex_request_duration_seconds_count{status_code=~"5.."}[1m])) by (namespace, job, route)\n  /\nsum(rate(cortex_request_duration_seconds_count[1m])) by (namespace, job, route)\n  > 1\n',
        for: "15m",
        labels: {
          severity: "warning"
        }
      },
      {
        alert: "CortexRequestLatency",
        annotations: {
          message:
            '{{ $labels.job }} {{ $labels.route }} is experiencing {{ printf "%.2f" $value }}s 99th percentile latency.\n',
          runbook_url: runbookUrl + "/cortex.md#CortexRequestLatency"
        },
        expr:
          'namespace_job_route:cortex_request_duration_seconds:99quantile{route!~"metrics|/frontend.Frontend/Process"}\n   >\n2.5\n',
        for: "15m",
        labels: {
          severity: "warning"
        }
      },
      {
        alert: "CortexTableSyncFailure",
        annotations: {
          message:
            '{{ $labels.job }} is experiencing {{ printf "%.2f" $value }}% errors syncing tables.\n',
          runbook_url: runbookUrl + "/cortex.md#CortexTableSyncFailure"
        },
        expr:
          '100 * rate(cortex_dynamo_sync_tables_seconds_count{status_code!~"2.."}[15m])\n  /\nrate(cortex_dynamo_sync_tables_seconds_count[15m])\n  > 10\n',
        for: "30m",
        labels: {
          severity: "critical"
        }
      },
      {
        alert: "CortexQueriesIncorrect",
        annotations: {
          message:
            '{{ $labels.job }} is reporting incorrect results for {{ printf "%.2f" $value }}% of queries.\n',
          runbook_url: runbookUrl + "/cortex.md#CortexQueriesIncorrect"
        },
        expr:
          '100 * sum by (job, namespace) (rate(test_exporter_test_case_result_total{result="fail"}[5m]))\n  /\nsum by (job, namespace) (rate(test_exporter_test_case_result_total[5m])) > 1\n',
        for: "15m",
        labels: {
          severity: "warning"
        }
      },
      {
        alert: "CortexQuerierCapacityFull",
        annotations: {
          message: "{{ $labels.job }} is at capacity processing queries.\n",
          runbook_url: runbookUrl + "/cortex.md#CortexQuerierCapacityFull"
        },
        expr:
          'prometheus_engine_queries_concurrent_max{job=~".+.querier"} - prometheus_engine_queries{job=~".+.querier"} == 0\n',
        for: "5m",
        labels: {
          severity: "critical"
        }
      },
      {
        alert: "CortexFrontendQueriesStuck",
        annotations: {
          message: "{{ $labels.job }} has {{ $value }} queued up queries.\n",
          runbook_url: runbookUrl + "/cortex.md#CortexFrontendQueriesStuck"
        },
        expr:
          'sum by (namespace) (cortex_query_frontend_queue_length{job=~".+.query-frontend"}) > 1\n',
        for: "5m",
        labels: {
          severity: "critical"
        }
      },
      {
        alert: "CortexCacheRequestErrors",
        annotations: {
          message:
            '{{ $labels.job }} cache {{ $labels.method }} is experiencing {{ printf "%.2f" $value }}% errors.\n',
          runbook_url: runbookUrl + "/cortex.md#CortexCacheRequestErrors"
        },
        expr:
          '100 * sum(rate(cortex_cache_request_duration_seconds_count{status_code=~"5.."}[1m])) by (namespace, job, method)\n  /\nsum(rate(cortex_cache_request_duration_seconds_count[1m])) by (namespace, job, method)\n  > 1\n',
        for: "15m",
        labels: {
          severity: "warning"
        }
      },
      {
        alert: "CortexIngesterRestarts",
        annotations: {
          message: "{{ $labels.namespace }}/{{ $labels.pod }} is restarting",
          runbook_url: runbookUrl + "/cortex.md#CortexIngesterRestarts"
        },
        expr:
          'rate(kube_pod_container_status_restarts_total{container="ingester"}[30m]) > 0\n',
        labels: {
          severity: "critical"
        }
      },
      {
        alert: "CortexTransferFailed",
        annotations: {
          message: "{{ $labels.namespace }}/{{ $labels.pod }} transfer failed.",
          runbook_url: runbookUrl + "/cortex.md#CortexTransferFailed"
        },
        expr:
          'max_over_time(cortex_shutdown_duration_seconds_count{op="transfer",status!="success"}[15m])\n',
        for: "5m",
        labels: {
          severity: "critical"
        }
      },
      {
        alert: "CortexOldChunkInMemory",
        annotations: {
          message:
            "{{ $labels.namespace }}/{{ $labels.pod }} has very old unflushed chunk in memory.\n",
          runbook_url: runbookUrl + "/cortex.md#CortexOldChunkInMemory"
        },
        // TODO opstrace-prelaunch/issues/355
        expr:
          "(time() - cortex_oldest_unflushed_chunk_timestamp_seconds > 50400) and cortex_oldest_unflushed_chunk_timestamp_seconds > 0\n",
        for: "5m",
        labels: {
          severity: "warning"
        }
      }
    ]
  },
  {
    name: "cortex_slo_alerts",
    rules: [
      {
        alert: "CortexWriteErrorBudgetBurn",
        annotations: {
          description:
            "{{ $value | printf `%.2f` }}% of {{ $labels.job }}'s write requests in the last 1h are failing or too slow to meet the SLO.",
          summary: "Cortex burns its write error budget too fast.",
          runbook_url: runbookUrl + "/cortex.md#CortexWriteErrorBudgetBurn"
        },
        expr:
          "(\n  (\n  100 * namespace_job:cortex_gateway_write_slo_errors_per_request:ratio_rate1h\n  > 0.1 * 14.400000\n  )\nand\n  (\n  100 * namespace_job:cortex_gateway_write_slo_errors_per_request:ratio_rate5m\n  > 0.1 * 14.400000\n  )\n)\n",
        for: "2m",
        labels: {
          period: "1h",
          severity: "critical"
        }
      },
      {
        alert: "CortexWriteErrorBudgetBurn",
        annotations: {
          description:
            "{{ $value | printf `%.2f` }}% of {{ $labels.job }}'s write requests in the last 6h are failing or too slow to meet the SLO.",
          summary: "Cortex burns its write error budget too fast.",
          runbook_url: runbookUrl + "/cortex.md#CortexWriteErrorBudgetBurn"
        },
        expr:
          "(\n  (\n  100 * namespace_job:cortex_gateway_write_slo_errors_per_request:ratio_rate6h\n  > 0.1 * 6.000000\n  )\nand\n  (\n  100 * namespace_job:cortex_gateway_write_slo_errors_per_request:ratio_rate30m\n  > 0.1 * 6.000000\n  )\n)\n",
        for: "15m",
        labels: {
          period: "6h",
          severity: "critical"
        }
      },
      {
        alert: "CortexWriteErrorBudgetBurn",
        annotations: {
          description:
            "{{ $value | printf `%.2f` }}% of {{ $labels.job }}'s write requests in the last 1d are failing or too slow to meet the SLO.",
          summary: "Cortex burns its write error budget too fast.",
          runbook_url: runbookUrl + "/cortex.md#CortexWriteErrorBudgetBurn"
        },
        expr:
          "(\n  (\n  100 * namespace_job:cortex_gateway_write_slo_errors_per_request:ratio_rate1d\n  > 0.1 * 3.000000\n  )\nand\n  (\n  100 * namespace_job:cortex_gateway_write_slo_errors_per_request:ratio_rate2h\n  > 0.1 * 3.000000\n  )\n)\n",
        for: "1h",
        labels: {
          period: "1d",
          severity: "warning"
        }
      },
      {
        alert: "CortexWriteErrorBudgetBurn",
        annotations: {
          description:
            "{{ $value | printf `%.2f` }}% of {{ $labels.job }}'s write requests in the last 3d are failing or too slow to meet the SLO.",
          summary: "Cortex burns its write error budget too fast.",
          runbook_url: runbookUrl + "/cortex.md#CortexWriteErrorBudgetBurn"
        },
        expr:
          "(\n  (\n  100 * namespace_job:cortex_gateway_write_slo_errors_per_request:ratio_rate3d\n  > 0.1 * 1.000000\n  )\nand\n  (\n  100 * namespace_job:cortex_gateway_write_slo_errors_per_request:ratio_rate6h\n  > 0.1 * 1.000000\n  )\n)\n",
        for: "3h",
        labels: {
          period: "3d",
          severity: "warning"
        }
      },
      {
        alert: "CortexReadErrorBudgetBurn",
        annotations: {
          description:
            "{{ $value | printf `%.2f` }}% of {{ $labels.job }}'s read requests in the last 1h are failing or too slow to meet the SLO.",
          summary: "Cortex burns its read error budget too fast.",
          runbook_url: runbookUrl + "/cortex.md#CortexReadErrorBudgetBurn"
        },
        expr:
          "(\n  (\n  100 * namespace_job:cortex_gateway_read_slo_errors_per_request:ratio_rate1h\n  > 0.5 * 14.400000\n  )\nand\n  (\n  100 * namespace_job:cortex_gateway_read_slo_errors_per_request:ratio_rate5m\n  > 0.5 * 14.400000\n  )\n)\n",
        for: "2m",
        labels: {
          period: "1h",
          severity: "critical"
        }
      },
      {
        alert: "CortexReadErrorBudgetBurn",
        annotations: {
          description:
            "{{ $value | printf `%.2f` }}% of {{ $labels.job }}'s read requests in the last 6h are failing or too slow to meet the SLO.",
          summary: "Cortex burns its read error budget too fast.",
          runbook_url: runbookUrl + "/cortex.md#CortexReadErrorBudgetBurn"
        },
        expr:
          "(\n  (\n  100 * namespace_job:cortex_gateway_read_slo_errors_per_request:ratio_rate6h\n  > 0.5 * 6.000000\n  )\nand\n  (\n  100 * namespace_job:cortex_gateway_read_slo_errors_per_request:ratio_rate30m\n  > 0.5 * 6.000000\n  )\n)\n",
        for: "15m",
        labels: {
          period: "6h",
          severity: "critical"
        }
      },
      {
        alert: "CortexReadErrorBudgetBurn",
        annotations: {
          description:
            "{{ $value | printf `%.2f` }}% of {{ $labels.job }}'s read requests in the last 1d are failing or too slow to meet the SLO.",
          summary: "Cortex burns its read error budget too fast.",
          runbook_url: runbookUrl + "/cortex.md#CortexReadErrorBudgetBurn"
        },
        expr:
          "(\n  (\n  100 * namespace_job:cortex_gateway_read_slo_errors_per_request:ratio_rate1d\n  > 0.5 * 3.000000\n  )\nand\n  (\n  100 * namespace_job:cortex_gateway_read_slo_errors_per_request:ratio_rate2h\n  > 0.5 * 3.000000\n  )\n)\n",
        for: "1h",
        labels: {
          period: "1d",
          severity: "warning"
        }
      },
      {
        alert: "CortexReadErrorBudgetBurn",
        annotations: {
          description:
            "{{ $value | printf `%.2f` }}% of {{ $labels.job }}'s read requests in the last 3d are failing or too slow to meet the SLO.",
          summary: "Cortex burns its read error budget too fast.",
          runbook_url: runbookUrl + "/cortex.md#CortexReadErrorBudgetBurn"
        },
        expr:
          "(\n  (\n  100 * namespace_job:cortex_gateway_read_slo_errors_per_request:ratio_rate3d\n  > 0.5 * 1.000000\n  )\nand\n  (\n  100 * namespace_job:cortex_gateway_read_slo_errors_per_request:ratio_rate6h\n  > 0.5 * 1.000000\n  )\n)\n",
        for: "3h",
        labels: {
          period: "3d",
          severity: "warning"
        }
      },
      {
        alert: "LegacyCortexWriteErrorBudgetBurn",
        annotations: {
          description:
            "{{ $value | printf `%.2f` }}% of {{ $labels.job }}'s write requests in the last 1h are failing or too slow to meet the SLO.",
          summary: "Cortex burns its write error budget too fast.",
          runbook_url:
            runbookUrl + "/cortex.md#LegacyCortexWriteErrorBudgetBurn"
        },
        expr:
          "(\n  (\n  100 * namespace_job:cortex_gw_write_slo_errors_per_request:ratio_rate1h\n  > 0.1 * 14.400000\n  )\nand\n  (\n  100 * namespace_job:cortex_gw_write_slo_errors_per_request:ratio_rate5m\n  > 0.1 * 14.400000\n  )\n)\n",
        for: "2m",
        labels: {
          period: "1h",
          severity: "critical"
        }
      },
      {
        alert: "LegacyCortexWriteErrorBudgetBurn",
        annotations: {
          description:
            "{{ $value | printf `%.2f` }}% of {{ $labels.job }}'s write requests in the last 6h are failing or too slow to meet the SLO.",
          summary: "Cortex burns its write error budget too fast.",
          runbook_url:
            runbookUrl + "/cortex.md#LegacyCortexWriteErrorBudgetBurn"
        },
        expr:
          "(\n  (\n  100 * namespace_job:cortex_gw_write_slo_errors_per_request:ratio_rate6h\n  > 0.1 * 6.000000\n  )\nand\n  (\n  100 * namespace_job:cortex_gw_write_slo_errors_per_request:ratio_rate30m\n  > 0.1 * 6.000000\n  )\n)\n",
        for: "15m",
        labels: {
          period: "6h",
          severity: "critical"
        }
      },
      {
        alert: "LegacyCortexWriteErrorBudgetBurn",
        annotations: {
          description:
            "{{ $value | printf `%.2f` }}% of {{ $labels.job }}'s write requests in the last 1d are failing or too slow to meet the SLO.",
          summary: "Cortex burns its write error budget too fast.",
          runbook_url:
            runbookUrl + "/cortex.md#LegacyCortexWriteErrorBudgetBurn"
        },
        expr:
          "(\n  (\n  100 * namespace_job:cortex_gw_write_slo_errors_per_request:ratio_rate1d\n  > 0.1 * 3.000000\n  )\nand\n  (\n  100 * namespace_job:cortex_gw_write_slo_errors_per_request:ratio_rate2h\n  > 0.1 * 3.000000\n  )\n)\n",
        for: "1h",
        labels: {
          period: "1d",
          severity: "warning"
        }
      },
      {
        alert: "LegacyCortexWriteErrorBudgetBurn",
        annotations: {
          description:
            "{{ $value | printf `%.2f` }}% of {{ $labels.job }}'s write requests in the last 3d are failing or too slow to meet the SLO.",
          summary: "Cortex burns its write error budget too fast.",
          runbook_url:
            runbookUrl + "/cortex.md#LegacyCortexWriteErrorBudgetBurn"
        },
        expr:
          "(\n  (\n  100 * namespace_job:cortex_gw_write_slo_errors_per_request:ratio_rate3d\n  > 0.1 * 1.000000\n  )\nand\n  (\n  100 * namespace_job:cortex_gw_write_slo_errors_per_request:ratio_rate6h\n  > 0.1 * 1.000000\n  )\n)\n",
        for: "3h",
        labels: {
          period: "3d",
          severity: "warning"
        }
      },
      {
        alert: "LegacyCortexReadErrorBudgetBurn",
        annotations: {
          description:
            "{{ $value | printf `%.2f` }}% of {{ $labels.job }}'s read requests in the last 1h are failing or too slow to meet the SLO.",
          summary: "Cortex burns its read error budget too fast.",
          runbook_url: runbookUrl + "/cortex.md#LegacyCortexReadErrorBudgetBurn"
        },
        expr:
          "(\n  (\n  100 * namespace_job:cortex_gw_read_slo_errors_per_request:ratio_rate1h\n  > 0.5 * 14.400000\n  )\nand\n  (\n  100 * namespace_job:cortex_gw_read_slo_errors_per_request:ratio_rate5m\n  > 0.5 * 14.400000\n  )\n)\n",
        for: "2m",
        labels: {
          period: "1h",
          severity: "critical"
        }
      },
      {
        alert: "LegacyCortexReadErrorBudgetBurn",
        annotations: {
          description:
            "{{ $value | printf `%.2f` }}% of {{ $labels.job }}'s read requests in the last 6h are failing or too slow to meet the SLO.",
          summary: "Cortex burns its read error budget too fast.",
          runbook_url: runbookUrl + "/cortex.md#LegacyCortexReadErrorBudgetBurn"
        },
        expr:
          "(\n  (\n  100 * namespace_job:cortex_gw_read_slo_errors_per_request:ratio_rate6h\n  > 0.5 * 6.000000\n  )\nand\n  (\n  100 * namespace_job:cortex_gw_read_slo_errors_per_request:ratio_rate30m\n  > 0.5 * 6.000000\n  )\n)\n",
        for: "15m",
        labels: {
          period: "6h",
          severity: "critical"
        }
      },
      {
        alert: "LegacyCortexReadErrorBudgetBurn",
        annotations: {
          description:
            "{{ $value | printf `%.2f` }}% of {{ $labels.job }}'s read requests in the last 1d are failing or too slow to meet the SLO.",
          summary: "Cortex burns its read error budget too fast.",
          runbook_url: runbookUrl + "/cortex.md#LegacyCortexReadErrorBudgetBurn"
        },
        expr:
          "(\n  (\n  100 * namespace_job:cortex_gw_read_slo_errors_per_request:ratio_rate1d\n  > 0.5 * 3.000000\n  )\nand\n  (\n  100 * namespace_job:cortex_gw_read_slo_errors_per_request:ratio_rate2h\n  > 0.5 * 3.000000\n  )\n)\n",
        for: "1h",
        labels: {
          period: "1d",
          severity: "warning"
        }
      },
      {
        alert: "LegacyCortexReadErrorBudgetBurn",
        annotations: {
          description:
            "{{ $value | printf `%.2f` }}% of {{ $labels.job }}'s read requests in the last 3d are failing or too slow to meet the SLO.",
          summary: "Cortex burns its read error budget too fast.",
          runbook_url: runbookUrl + "/cortex.md#LegacyCortexReadErrorBudgetBurn"
        },
        expr:
          "(\n  (\n  100 * namespace_job:cortex_gw_read_slo_errors_per_request:ratio_rate3d\n  > 0.5 * 1.000000\n  )\nand\n  (\n  100 * namespace_job:cortex_gw_read_slo_errors_per_request:ratio_rate6h\n  > 0.5 * 1.000000\n  )\n)\n",
        for: "3h",
        labels: {
          period: "3d",
          severity: "warning"
        }
      }
    ]
  },
  {
    name: "cortex_gw_alerts",
    rules: [
      {
        alert: "CortexGWRequestErrors",
        annotations: {
          message:
            '{{ $labels.job }} {{ $labels.route }} is experiencing {{ printf "%.2f" $value }}% errors.\n',
          runbook_url: runbookUrl + "/cortex.md#CortexGWRequestErrors"
        },
        expr:
          '100 * sum(rate(cortex_gw_request_duration_seconds_count{status_code=~"5.."}[1m])) by (namespace, job, route)\n  /\nsum(rate(cortex_gw_request_duration_seconds_count[1m])) by (namespace, job, route)\n  > 0.1\n',
        for: "15m",
        labels: {
          severity: "critical"
        }
      },
      {
        alert: "CortexGWRequestLatency",
        annotations: {
          message:
            '{{ $labels.job }} {{ $labels.route }} is experiencing {{ printf "%.2f" $value }}s 99th percentile latency.\n',
          runbook_url: runbookUrl + "/cortex.md#CortexGWRequestLatency"
        },
        expr:
          'namespace_job_route:cortex_gw_request_duration_seconds:99quantile{route!="metrics"}\n  >\n2.5\n',
        for: "15m",
        labels: {
          severity: "critical"
        }
      }
    ]
  },
  {
    name: "cortex-provisioning",
    rules: [
      {
        alert: "CortexProvisioningMemcachedTooSmall",
        annotations: {
          message:
            'Chunk memcached cluster for namespace {{ $labels.namespace }} are too small, should be at least {{ printf "%.2f" $value }}GB.\n',
          runbook_url:
            runbookUrl + "/cortex.md#CortexProvisioningMemcachedTooSmall"
        },
        expr:
          '(\n  4 *\n  sum by(namespace) (cortex_ingester_memory_series{job=~".+.ingester"} * cortex_ingester_chunk_size_bytes_sum{job=~".+.ingester"} / cortex_ingester_chunk_size_bytes_count{job=~".+.ingester"})\n   / 1e9\n)\n  >\n(\n  sum by (namespace) (memcached_limit_bytes{job=~".+.memcached"}) / 1e9\n)\n',
        for: "15m",
        labels: {
          severity: "warning"
        }
      },
      {
        alert: "CortexProvisioningTooManyActiveSeries",
        annotations: {
          message:
            "Too many active series for ingesters in namespace {{ $labels.namespace }}, add more ingesters.\n",
          runbook_url:
            runbookUrl + "/cortex.md#CortexProvisioningTooManyActiveSeries"
        },
        expr:
          'avg by (namespace) (cortex_ingester_memory_series{job=~".+.ingester"}) > 1.1e6\n  and\nsum by (namespace) (rate(cortex_ingester_received_chunks{job=~".+.ingester"}[1h])) == 0\n',
        for: "1h",
        labels: {
          severity: "warning"
        }
      },
      {
        alert: "CortexProvisioningTooManyWrites",
        annotations: {
          message:
            "Too much write QPS for ingesters in namespace {{ $labels.namespace }}, add more ingesters.\n",
          runbook_url: runbookUrl + "/cortex.md#CortexProvisioningTooManyWrites"
        },
        expr:
          "avg by (namespace) (rate(cortex_ingester_ingested_samples_total[1m])) > 80e3\n",
        for: "15m",
        labels: {
          severity: "warning"
        }
      },
      {
        alert: "CortexProvisioningTooMuchMemory",
        annotations: {
          message:
            "Too much memory being used by ingesters in namespace {{ $labels.namespace }}, add more ingesters.\n",
          runbook_url: runbookUrl + "/cortex.md#CortexProvisioningTooMuchMemory"
        },
        expr:
          'avg by (namespace) (container_memory_working_set_bytes{container_name="ingester"} / container_spec_memory_limit_bytes{container_name="ingester"}) > 0.7\n',
        for: "15m",
        labels: {
          severity: "critical"
        }
      }
    ]
  },
  {
    name: "memcached",
    rules: [
      {
        alert: "MemcachedDown",
        annotations: {
          message:
            "Memcached Instance {{ $labels.instance }} is down for more than 15mins.\n",
          runbook_url: runbookUrl + "/cortex.md#MemcachedDown"
        },
        expr: "memcached_up == 0\n",
        for: "15m",
        labels: {
          severity: "critical"
        }
      }
    ]
  },
  {
    name: "ruler_alerts",
    rules: [
      {
        alert: "CortexRulerFailedEvaluations",
        annotations: {
          message:
            '{{ $labels.job }} is experiencing {{ printf "%.2f" $value }}% errors.\n',
          runbook_url: runbookUrl + "/cortex.md#CortexRulerFailedEvaluations"
        },
        expr:
          "sum(rate(cortex_prometheus_rule_evaluation_failures_total[1m])) by (namespace, job)\n  /\nsum(rate(cortex_prometheus_rule_evaluation_total[1m])) by (namespace, job)\n  > 0.01\n",
        for: "5m",
        labels: {
          severity: "warning"
        }
      },
      {
        alert: "CortexRulerMissedEvaluations",
        annotations: {
          message:
            '{{ $labels.job }} is experiencing {{ printf "%.2f" $value }}% missed iterations.\n',
          runbook_url: runbookUrl + "/cortex.md#CortexRulerMissedEvaluations"
        },
        expr:
          "sum(rate(cortex_prometheus_rule_group_missed_iterations_total[1m])) by (namespace, job)\n  /\nsum(rate(cortex_prometheus_rule_group_iterations_total[1m])) by (namespace, job)\n  > 0.01\n",
        for: "5m",
        labels: {
          severity: "warning"
        }
      }
    ]
  },
  {
    name: "loki_alerts",
    rules: [
      {
        alert: "LokiRequestErrors",
        annotations: {
          message:
            '{{ $labels.job }} {{ $labels.route }} is experiencing {{ printf "%.2f" $value }}% errors.\n'
        },
        // TODO (clambert) return the threhold of this alert back to the original 18.
        expr:
          '100 * sum(rate(loki_request_duration_seconds_count{status_code=~"5.."}[1m])) by (namespace, job, route)\n  /\nsum(rate(loki_request_duration_seconds_count[1m])) by (namespace, job, route)\n  > 25\n',
        for: "15m",
        labels: {
          severity: "critical"
        }
      },
      {
        alert: "LokiRequestLatency",
        annotations: {
          message:
            '{{ $labels.job }} {{ $labels.route }} is experiencing {{ printf "%.2f" $value }}s 99th percentile latency.\n'
        },
        expr:
          'namespace_job_route:loki_request_duration_seconds:99quantile{route!~"(?i).*tail.*"} > 2.5\n',
        for: "15m",
        labels: {
          severity: "critical"
        }
      }
    ]
  }
];
