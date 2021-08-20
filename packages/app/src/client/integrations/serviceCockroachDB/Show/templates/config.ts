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

type CockroachAgentProps = {
  // The Opstrace cluster hostname (foo.opstrace.io) where metrics data should be sent
  clusterHost: string;
  // The Opstrace tenant where metrics data should be sent
  tenantName: string;
  // The unique id that sent metrics should have as a label
  integrationId: string;
  // The host:port endpoints for the cockroach nodes
  nodeEndpoints: string[];
};

export function agentYaml({
  clusterHost,
  tenantName,
  integrationId,
  nodeEndpoints
}: CockroachAgentProps): string {
  return `server:
  http_listen_port: 8080
refresh_interval: 60s
prometheus:
  wal_directory: /tmp/grafana-agent-wal
  configs:
  - name: integrations
    remote_write:
    - url: https://cortex.${tenantName}.${clusterHost}/api/v1/push
      authorization:
        credentials_file: /home/nick/cdb/tenant-api-token-default
    scrape_configs:
    - job_name: cockroachdb
      metrics_path: /_status/vars
      scheme: https
      tls_config:
        # To enable TLS validation, provide the path to the CA certificate used by cockroachdb
        #ca_file: '/var/run/certs/ca.crt'
        insecure_skip_verify: true
      static_configs:
      - labels:
          integration_id: '${integrationId}'
        # Cockroach node endpoints, can get with:
        #  cockroach node status --format tsv --certs-dir ./certs/ | awk '{print $2}' | tail -n +2
        targets: ${nodeEndpoints}
`;
}

type CockroachK8sProps = {
  // The Opstrace cluster hostname (foo.opstrace.io) where metrics data should be sent
  clusterHost: string;
  // The Opstrace tenant where metrics data should be sent
  tenantName: string;
  // The unique id that sent metrics should have as a label
  integrationId: string;
  // Where the user would like the agent to be deployed in their cluster
  deployNamespace: string;
  // Where the service to be scraped is running
  selectNamespace: string;
  // The name of a label used to identify pods for the service (e.g. 'app')
  selectLabelName: string;
  // The value of a label used to identify pods for the service (e.g. 'cockroachdb')
  selectLabelValue: string;
};

// Returns a rendered prometheus deployment YAML for displaying to a user.
// After replacing __AUTH_TOKEN__ with the tenant auth token, the user can pass this to 'kubectl apply -f'.
export function k8sYaml({
  clusterHost,
  tenantName,
  integrationId,
  deployNamespace,
  selectNamespace,
  selectLabelName,
  selectLabelValue
}: CockroachK8sProps): string {
  return `apiVersion: v1
kind: Namespace
metadata:
  name: ${deployNamespace}
---
apiVersion: v1
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
  name: opstrace-cockroachdb
  namespace: ${deployNamespace}
data:
  agent.yml: |-
    server:
      http_listen_port: 8080
    refresh_interval: 60s
    prometheus:
      wal_directory: /tmp/grafana-agent-wal
      configs:
      - name: integrations
        remote_write:
        - url: https://cortex.${tenantName}.${clusterHost}/api/v1/push
          authorization:
            credentials_file: /var/run/tenant-auth/token
        scrape_configs:

        - job_name: 'cockroachdb-pods'
          kubernetes_sd_configs:
          - role: pod

          namespaces:
            names:
            - '${selectNamespace}'
          selectors:
          - role: pod
            label: '${selectLabelName}:${selectLabelValue}'

          metrics_path: /_status/vars

          scheme: https
          tls_config:
            # To enable TLS validation, provide the CA certificate used by cockroachdb to the agent pod
            #ca_file: '/var/run/certs/ca.crt'
            insecure_skip_verify: true

          relabel_configs:
          # Include <namespace>/<pod name>
          - action: replace
            source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_pod_name]
            separator: /
            replacement: $1
            target_label: job
          # Include namespace
          - action: replace
            source_labels: [__meta_kubernetes_namespace]
            target_label: namespace
          # Include pod name without namespace
          - action: replace
            source_labels: [__meta_kubernetes_pod_name]
            target_label: instance
          # Include parent replicaset/statefulset/daemonset name
          - action: replace
            source_labels: [__meta_kubernetes_pod_controller_name]
            target_label: controller
          # Include container name within pod
          - action: replace
            source_labels: [__meta_kubernetes_pod_container_name]
            target_label: container
          # Include node name
          - action: replace
            source_labels: [__meta_kubernetes_pod_node_name]
            target_label: node

          # Include integration ID for separation in opstrace
          - source_labels: []
            target_label: integration_id
            replacement: '${integrationId}'

          # TODO remove??
          # Internal labels used by prometheus itself
          # Always use HTTPS for scraping the api server
          - source_labels: [__meta_kubernetes_service_label_component]
            regex: apiserver
            action: replace
            target_label: __scheme__
            replacement: https
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: opstrace-cockroachdb
  namespace: ${deployNamespace}
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: opstrace-cockroachdb
rules:
- apiGroups:
  - ""
  resources:
  - pods
  verbs:
  - get
  - list
  - watch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: opstrace-cockroachdb
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: opstrace-cockroachdb
subjects:
- kind: ServiceAccount
  name: opstrace-cockroachdb
  namespace: ${deployNamespace}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: opstrace-cockroachdb
  namespace: ${deployNamespace}
spec:
  replicas: 1
  selector:
    matchLabels:
      name: opstrace-cockroachdb
  template:
    metadata:
      labels:
        name: opstrace-cockroachdb
    spec:
      serviceAccountName: opstrace-cockroachdb
      containers:
      - name: prometheus
        image: grafana/agent:v0.18.2
        imagePullPolicy: IfNotPresent
        args:
        - --config.file=/etc/agent/agent.yml
        ports:
        - name: metrics
          containerPort: 8080
        volumeMounts:
        # Agent configmap
        - name: config
          mountPath: /etc/prometheus
        # Opstrace tenant auth secret
        - name: tenant-auth
          mountPath: /var/run/tenant-auth
          readOnly: true
      volumes:
        - name: config
          configMap:
            name: opstrace-cockroachdb
        - name: tenant-auth
          secret:
            secretName: opstrace-tenant-auth
`;
}
