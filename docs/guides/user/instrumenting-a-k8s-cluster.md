# Sending logs and metrics from a Kubernetes cluster

This guide will show how you can monitor a [Kubernetes](https://kubernetes.io) (k8s) cluster using your Opstrace cluster.

Specifically, the goal is to

* scrape k8s system metrics, and push them to the Opstrace cluster.
* collect logs of workloads (containers) running on the k8s cluster, and send them to the Opstrace cluster.

To that end,

* we will deploy a single Prometheus instance in the k8s cluster (as a k8s deployment): it will scrape the various k8s system metric endpoints, and then push all collected data to the remote Opstrace cluster.
* we will deploy a Promtail instance on each node in the k8s cluster (as a k8s daemon set): it will collect all local container logs and push them into the remote Opstrace cluster.

## Prerequisites

* An Opstrace cluster.
* A decision: for which Opstrace tenant would you like to send data?
* An Opstrace tenant authentication token file (for the tenant of your choice). Also see [concepts](../../references/concepts.md).

For following this guide step-by-step you will additionally need [kind](https://kind.sigs.k8s.io/docs/user/quick-start/#installation) installed on your computer.
`Kind` is a tool for running a local k8s cluster using Docker.

## 1: Create a Kubernetes cluster

```bash
kind create cluster
```

## 2: Set up `kubectl` to point to the kind cluster

```bash
kubectl cluster-info --context kind-kind
```

## 3: Create a k8s secret with tenant authentication token

Copy the `default` tenant's data API authentication token.
Create a new file and name it `secret.yaml`

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: tenant-auth-token-default
stringData:
  authToken: <YOUR AUTH TOKEN HERE>
```

Create the secret:

```bash
kubectl apply -f secret.yaml
```

## 4: Deploy a Prometheus instance in the k8s cluster for scraping metrics

Create a file named `prometheus-config.yaml` with the following contents.
Replace `${CLUSTER_NAME}` with the name of your Opstrace cluster.

Note that the configuration snippets below assume that the Opstrace tenant you would like to send data to is called `default`.

```yaml
kind: ConfigMap
apiVersion: v1
metadata:
  name: prometheus-config
data:
  prometheus.yml: |-
    remote_write:
    - url: https://cortex.${TENANT_NAME}.${CLUSTER_NAME}.opstrace.io/api/v1/push
      bearer_token_file: /var/run/${TENANT_NAME}-tenant/authToken

    scrape_configs:
    - job_name: 'kubernetes-pods'
      kubernetes_sd_configs:
        - role: pod

      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token

      relabel_configs:

      # Always use HTTPS for the api server
      - source_labels: [__meta_kubernetes_service_label_component]
        regex: apiserver
        action: replace
        target_label: __scheme__
        replacement: https

      # Rename jobs to be <namespace>/<name, from pod name label>
      - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_pod_label_name]
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

    # This scrape config gather all nodes
    - job_name: 'kubernetes-nodes'
      kubernetes_sd_configs:
        - role: node

      tls_config:
        insecure_skip_verify: true
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token

      relabel_configs:
      - target_label: __scheme__
        replacement: https
      - source_labels: [__meta_kubernetes_node_label_kubernetes_io_hostname]
        target_label: instance

    # This scrape config just pulls in the default/kubernetes service
    - job_name: 'kubernetes-service'
      kubernetes_sd_configs:
        - role: endpoints

      tls_config:
        insecure_skip_verify: true
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token

      relabel_configs:
      - source_labels: [__meta_kubernetes_service_label_component]
        regex: apiserver
        action: keep

      - target_label: __scheme__
        replacement: https

      - source_labels: []
        target_label: job
        replacement: default/kubernetes
```

Submit this config map:

```bash
kubectl apply -f prometheus-config.yaml
```

Next up, create a file named `prometheus.yaml`

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: prometheus
rules:
- apiGroups: [""]
  resources:
  - nodes
  - nodes/proxy
  - services
  - endpoints
  - pods
  verbs: ["get", "list", "watch"]
- nonResourceURLs: ["/metrics"]
  verbs: ["get"]
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: prometheus
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: prometheus
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: prometheus
subjects:
- kind: ServiceAccount
  name: prometheus
  namespace: default
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
spec:
  replicas: 1
  selector:
    matchLabels:
      name: prometheus
  template:
    metadata:
      labels:
        name: prometheus
    spec:
      serviceAccountName: prometheus
      containers:
      - name: retrieval
        image: prom/prometheus:v2.21.0
        imagePullPolicy: IfNotPresent
        args:
        - --config.file=/etc/prometheus/prometheus.yml
        ports:
        - containerPort: 9090
        volumeMounts:
        - name: config-volume
          mountPath: /etc/prometheus
        - name: tenant-auth-token-default
          mountPath: /var/run/default-tenant
          readOnly: true
      volumes:
        - name: config-volume
          configMap:
            name: prometheus-config
        - name: tenant-auth-token-default
          secret:
            secretName: tenant-auth-token-default
```

Then start the Prometheus deployment with the following command:

```bash
kubectl apply -f prometheus.yaml
```

## 5: Deploy Promtail in the k8s cluster for collecting and pushing logs

Create a file named `promtail-config.yaml` with the following contents.
Replace `${CLUSTER_NAME}` with the name of your Opstrace cluster.

Note that the configuration snippets below assume that the Opstrace tenant you would like to send data to is called `default`.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: promtail-config
data:
  promtail.yml: |
    client:
      url: https://loki.default.#{CLUSTER_NAME}.opstrace.io/loki/api/v1/push
      bearer_token_file: /var/run/default-tenant/authToken

    scrape_configs:
    - pipeline_stages:
      - docker:
      job_name: kubernetes-pods-name
      kubernetes_sd_configs:
      - role: pod
      relabel_configs:
      - source_labels:
        - __meta_kubernetes_pod_label_name
        target_label: __service__
      - source_labels:
        - __meta_kubernetes_pod_node_name
        target_label: __host__
      - action: drop
        regex: ^$
        source_labels:
        - __service__
      - action: replace
        replacement: $1
        separator: /
        source_labels:
        - __meta_kubernetes_namespace
        - __service__
        target_label: k8s_app

      - action: replace
        source_labels:
        - __meta_kubernetes_namespace
        target_label: k8s_namespace_name

      - action: replace
        source_labels:
        - __meta_kubernetes_pod_name
        target_label: k8s_pod_name

      - action: replace
        source_labels:
        - __meta_kubernetes_pod_container_name
        target_label: k8s_container_name

      - replacement: /var/log/pods/*$1/*.log
        separator: /
        source_labels:
        - __meta_kubernetes_pod_uid
        - __meta_kubernetes_pod_container_name
        target_label: __path__

      - replacement: /var/log/pods/*$1/*.log
        separator: /
        source_labels:
        - __meta_kubernetes_pod_uid
        - __meta_kubernetes_pod_container_name
        target_label: __path__

    - pipeline_stages:
      - docker:
      job_name: kubernetes-pods-static
      kubernetes_sd_configs:
      - role: pod
      relabel_configs:
      - action: drop
        regex: ^$
        source_labels:
        - __meta_kubernetes_pod_annotation_kubernetes_io_config_mirror

      - action: replace
        source_labels:
        - __meta_kubernetes_pod_label_component
        target_label: __service__

      - source_labels:
        - __meta_kubernetes_pod_node_name
        target_label: __host__

      - action: drop
        regex: ^$
        source_labels:
        - __service__

      - action: replace
        replacement: $1
        separator: /
        source_labels:
        - __meta_kubernetes_namespace
        - __service__
        target_label: k8s_app

      - action: replace
        source_labels:
        - __meta_kubernetes_namespace
        target_label: k8s_namespace_name

      - action: replace
        source_labels:
        - __meta_kubernetes_pod_name
        target_label: k8s_pod_name

      - action: replace
        source_labels:
        - __meta_kubernetes_pod_container_name
        target_label: k8s_container_name

      - replacement: /var/log/pods/*$1/*.log
        separator: /
        source_labels:
        - __meta_kubernetes_pod_annotation_kubernetes_io_config_mirror
        - __meta_kubernetes_pod_container_name
        target_label: __path__
```

Submit this config map:

```bash
kubectl apply -f promtail-config.yaml
```

Create a file `promtail.yaml` with the following contents:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: promtail
spec:
  minReadySeconds: 10
  selector:
    matchLabels:
      name: promtail
  template:
    metadata:
      labels:
        name: promtail
    spec:
      containers:
      - args:
        - -config.file=/etc/promtail/promtail.yml
        env:
        - name: HOSTNAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        image: grafana/promtail:1.6.1
        imagePullPolicy: Always
        name: promtail
        readinessProbe:
          httpGet:
            path: /ready
            port: http-metrics
            scheme: HTTP
          initialDelaySeconds: 10
        ports:
        - containerPort: 80
          name: http-metrics
        securityContext:
          privileged: true
          runAsUser: 0
        volumeMounts:
        - mountPath: /etc/promtail
          name: promtail-config
        - mountPath: /var/log
          name: varlog
        - mountPath: /var/lib/docker/containers
          name: varlibdockercontainers
          readOnly: true
        - mountPath: /var/run/default-tenant
          name: tenant-auth-token-default
          readOnly: true
      serviceAccount: promtail
      tolerations:
      - effect: NoSchedule
        operator: Exists
      volumes:
      - configMap:
          name: promtail-config
        name: promtail-config
      - secret:
          secretName: tenant-auth-token-default
        name: tenant-auth-token-default
      - hostPath:
          path: /var/log
        name: varlog
      - hostPath:
          path: /var/lib/docker/containers
        name: varlibdockercontainers
  updateStrategy:
    type: RollingUpdate
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: promtail
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: promtail
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
  name: promtail
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: promtail
subjects:
- kind: ServiceAccount
  name: promtail
  namespace: default
```

Start the Promtail deployment with the following command:

```bash
kubectl apply -f promtail.yaml
```

## 6: Explore

You can explore the logs and metrics sent to your Opstrace cluster using the Grafana explore view:

```bash
open https://default.${CLUSTER_NAME}.opstrace.io/grafana/explore
```
