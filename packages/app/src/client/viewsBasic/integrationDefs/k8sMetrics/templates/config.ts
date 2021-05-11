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

// Returns a rendered prometheus deployment YAML for displaying to a user.
// The user can pass this to kubectl for collecting metrics from their cluster.
//
// Args:
// - clusterName: The Opstrace cluster where metrics data should be sent
// - tenantName: The Opstrace tenant where metrics data should be sent
// - integrationId: The unique id that sent metrics should have as a label
// - deployNamespace: Where the user would like Prometheus to be deployed in their cluster
//
// The returned multiline string will contain '__AUTH_TOKEN__' for the user to replace locally.

type Props = {
  clusterName: String;
  tenantName: String;
  integrationId: String;
  deployNamespace: String;
};

export function prometheusYaml({
  clusterName,
  tenantName,
  integrationId,
  deployNamespace
}: Props): BlobPart {
  return `apiVersion: v1
kind: Secret
metadata:
  name: opstrace-tenant-auth
  namespace: ${deployNamespace}
stringData:
  token: '__AUTH_TOKEN__'
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: opstrace-prometheus
  namespace: ${deployNamespace}
data:
  prometheus.yml: |-
    remote_write:
    - url: https://cortex.${tenantName}.${clusterName}.opstrace.io/api/v1/push
      authorization:
        credentials_file: /var/run/tenant-auth/token

    scrape_configs:
    # Collection of per-pod metrics
    - job_name: 'kubernetes-pods'
      kubernetes_sd_configs:
      - role: pod

      # TLS config for getting pod info, not querying pods themselves
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
      authorization:
        credentials_file: /var/run/secrets/kubernetes.io/serviceaccount/token

      relabel_configs:
      # Always use HTTPS for the api server
      - source_labels: [__meta_kubernetes_service_label_component]
        regex: apiserver
        action: replace
        target_label: __scheme__
        replacement: https
      # Rename jobs to be <namespace>/<name, from pod name label>
      - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_pod_name]
        action: replace
        separator: /
        target_label: job
        replacement: $1
      # Rename instances to be the pod name
      - source_labels: [__meta_kubernetes_pod_name]
        action: replace
        target_label: instance
      # Include node name as a extra field
      - source_labels: [__meta_kubernetes_pod_node_name]
        target_label: node
      # Include integration ID for autodetection in opstrace
      - source_labels: []
        target_label: integration_id
        replacement: ${integrationId}

    # Collection of per-node metrics
    - job_name: 'kubernetes-nodes'
      kubernetes_sd_configs:
      - role: node

      scheme: https
      # TLS config for getting list of nodes to scrape, not querying nodes themselves
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
      authorization:
        credentials_file: /var/run/secrets/kubernetes.io/serviceaccount/token

      relabel_configs:
      - target_label: __scheme__
        replacement: https
      # Include node hostname
      - source_labels: [__meta_kubernetes_node_label_kubernetes_io_hostname]
        target_label: instance
      # Include integration ID for autodetection in opstrace
      - source_labels: []
        target_label: integration_id
        replacement: ${integrationId}

    # Collection of the default/kubernetes service
    - job_name: 'kubernetes-service'
      kubernetes_sd_configs:
      - role: endpoints

      # TLS config for getting endpoint info, not querying nodes themselves
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
      authorization:
        credentials_file: /var/run/secrets/kubernetes.io/serviceaccount/token

      relabel_configs:
      - source_labels: [__meta_kubernetes_service_label_component]
        regex: apiserver
        action: keep
      - target_label: __scheme__
        replacement: https
      # Include job label for the service
      - source_labels: []
        target_label: job
        replacement: default/kubernetes
      # Include integration ID for autodetection in opstrace
      - source_labels: []
        target_label: integration_id
        replacement: ${integrationId}
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: opstrace-prometheus
  namespace: ${deployNamespace}
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: opstrace-prometheus
rules:
- apiGroups:
  - ""
  resources:
  - nodes
  - nodes/metrics
  - nodes/proxy
  - services
  - endpoints
  - pods
  verbs:
  - get
  - list
  - watch
- nonResourceURLs:
  - /metrics
  verbs:
  - get
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: opstrace-prometheus
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: opstrace-prometheus
subjects:
- kind: ServiceAccount
  name: opstrace-prometheus
  namespace: ${deployNamespace}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: opstrace-prometheus
  namespace: ${deployNamespace}
spec:
  replicas: 1
  selector:
    matchLabels:
      name: opstrace-prometheus
  template:
    metadata:
      labels:
        name: opstrace-prometheus
    spec:
      serviceAccountName: opstrace-prometheus
      containers:
      - name: prometheus
        image: prom/prometheus:v2.26.0
        imagePullPolicy: IfNotPresent
        args:
        - --config.file=/etc/prometheus/prometheus.yml
        ports:
        - name: ui
          containerPort: 9090
        volumeMounts:
        - name: config
          mountPath: /etc/prometheus
        - name: tenant-auth
          mountPath: /var/run/tenant-auth
          readOnly: true
      volumes:
        - name: config
          configMap:
            name: opstrace-prometheus
        - name: tenant-auth
          secret:
            secretName: opstrace-tenant-auth
`;
}

// Returns a rendered prometheus deployment YAML for displaying to a user.
// The user can pass this to kubectl for collecting metrics from their cluster.
//
// Args:
// - clusterName: The Opstrace cluster where metrics data should be sent
// - tenantName: The Opstrace tenant where metrics data should be sent
// - integrationId: The unique id that sent metrics should have as a label
// - deployNamespace: Where the user would like Prometheus to be deployed in their cluster
//
// The returned multiline string will contain '__AUTH_TOKEN__' for the user to replace locally.
export function promtailYaml({
  clusterName,
  tenantName,
  integrationId,
  deployNamespace
}: Props): BlobPart {
  return `apiVersion: v1
kind: Secret
metadata:
  name: opstrace-tenant-auth
  namespace: ${deployNamespace}
stringData:
  token: '__AUTH_TOKEN__'
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: opstrace-promtail
  namespace: ${deployNamespace}
data:
  promtail.yml: |
    client:
      url: https://loki.${tenantName}.${clusterName}.opstrace.io/loki/api/v1/push
      bearer_token_file: /var/run/tenant-auth/token

    scrape_configs:
    - pipeline_stages:
      - docker:
      job_name: kubernetes-pods-name
      kubernetes_sd_configs:
      - role: pod
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_name]
        target_label: __service__
      - source_labels: [__meta_kubernetes_pod_node_name]
        target_label: __host__
      - action: drop
        regex: ^$
        source_labels: [__service__]
      - action: replace
        replacement: $1
        separator: /
        source_labels: [__meta_kubernetes_namespace, __service__]
        target_label: k8s_app

      - action: replace
        source_labels: [__meta_kubernetes_namespace]
        target_label: k8s_namespace_name

      - action: replace
        source_labels: [__meta_kubernetes_pod_name]
        target_label: k8s_pod_name

      - action: replace
        source_labels: [__meta_kubernetes_pod_container_name]
        target_label: k8s_container_name

      - replacement: /var/log/pods/*$1/*.log
        separator: /
        source_labels: [__meta_kubernetes_pod_uid, __meta_kubernetes_pod_container_name]
        target_label: __path__

      - replacement: /var/log/pods/*$1/*.log
        separator: /
        source_labels: [__meta_kubernetes_pod_uid, __meta_kubernetes_pod_container_name]
        target_label: __path__

      # Include integration ID for autodetection in opstrace
      - source_labels: []
        target_label: integration_id
        replacement: ${integrationId}

    - pipeline_stages:
      - docker:
      job_name: kubernetes-pods-static
      kubernetes_sd_configs:
      - role: pod
      relabel_configs:
      - action: drop
        regex: ^$
        source_labels: [__meta_kubernetes_pod_annotation_kubernetes_io_config_mirror]

      - action: replace
        source_labels: [__meta_kubernetes_pod_label_component]
        target_label: __service__

      - source_labels: [__meta_kubernetes_pod_node_name]
        target_label: __host__

      - action: drop
        regex: ^$
        source_labels: [__service__]

      - action: replace
        replacement: $1
        separator: /
        source_labels: [__meta_kubernetes_namespace, __service__]
        target_label: k8s_app

      - action: replace
        source_labels: [__meta_kubernetes_namespace]
        target_label: k8s_namespace_name

      - action: replace
        source_labels: [__meta_kubernetes_pod_name]
        target_label: k8s_pod_name

      - action: replace
        source_labels: [__meta_kubernetes_pod_container_name]
        target_label: k8s_container_name

      - replacement: /var/log/pods/*$1/*.log
        separator: /
        source_labels: [__meta_kubernetes_pod_annotation_kubernetes_io_config_mirror, __meta_kubernetes_pod_container_name]
        target_label: __path__

      # Include integration ID for autodetection in opstrace
      - source_labels: []
        target_label: integration_id
        replacement: ${integrationId}
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: opstrace-promtail
  namespace: ${deployNamespace}
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: opstrace-promtail
rules:
- apiGroups:
  - ""
  resources:
  - nodes
  - nodes/proxy
  - services
  - endpoints
  - pods
  verbs:
  - get
  - list
  - watch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: opstrace-promtail
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: opstrace-promtail
subjects:
- kind: ServiceAccount
  name: opstrace-promtail
  namespace: ${deployNamespace}
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: opstrace-promtail
  namespace: ${deployNamespace}
spec:
  minReadySeconds: 10
  updateStrategy:
    type: RollingUpdate
  selector:
    matchLabels:
      name: promtail
  template:
    metadata:
      labels:
        name: promtail
    spec:
      serviceAccount: opstrace-promtail
      tolerations:
      - effect: NoSchedule
        operator: Exists
      containers:
      - name: promtail
        image: grafana/promtail:2.2.1 # TODO(nick) was 1.6.1
        imagePullPolicy: IfNotPresent
        args:
        - -config.file=/etc/promtail/promtail.yml
        env:
        - name: HOSTNAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        ports:
        - name: http-metrics
          containerPort: 80
        readinessProbe:
          httpGet:
            path: /ready
            port: http-metrics
            scheme: HTTP
          initialDelaySeconds: 10
        securityContext:
          privileged: true
          runAsUser: 0
        volumeMounts:
        - name: config
          mountPath: /etc/promtail
        - name: tenant-auth
          mountPath: /var/run/tenant-auth
          readOnly: true
        - name: varlog
          mountPath: /var/log
          readOnly: true
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: opstrace-promtail
      - name: tenant-auth
        secret:
          secretName: opstrace-tenant-auth
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
`;
}
