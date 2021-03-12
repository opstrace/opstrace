# Monitoring an Application Running in Kubernetes on AWS

In this guide we will show you how to monitor an application running in Kubernetes using your Opstrace cluster.
You will:

1. Create a Kubernetes cluster if you don't already have one.
2. Deploy Prometheus and Promtail to Kubernetes using Helm.
These will let you collect metrics and logs about Kubernetes and any apps running on it.
3. Add some Prometheus alerts for the Kubernetes cluster.
4. Add some Grafana dashboards to your Opstrace cluster to let you visualize the health of your Kubernetes cluster.
5. Add some Prometheus alerts and Grafana dashboards for your application as well.

## Prerequisites

* An Opstrace cluster and its tenant authentication token (for the tenant of your choice).
Follow our [Quick Start](../../quickstart.md) if you don't have a cluster yet.
* [Helm](https://helm.sh/docs/intro/install/).
* If you don't have a Kubernetes cluster, an Amazon Web Services (AWS) account.
You'll need the [AWS CLI](https://aws.amazon.com/cli/) and [eksctl](https://eksctl.io/introduction/#installation) as well.

You don't need to have a Kubernetes cluster already, but if you do have one, great--you can use that.
We will show you how to monitor the cluster and an application running on it.

## 1. Create a Kubernetes cluster

If you already have a Kubernetes cluster, configure `kubectl` to use it, and move on to step 2.
Otherwise, make sure your AWS credentials are configured in environment variables or in `~/.aws/credentials`, and create a Kubernetes cluster in us-west-2 (or whatever region you want):

```bash
eksctl create cluster --name eks-2-mon --region us-west-2
```

When the cluster is finished, point `kubectl` to it:

```bash
aws eks update-kubeconfig --name eks-2-mon --region us-west-2
```

## 2. Deploy Prometheus and Promtail using Helm

If you haven't installed [Helm](https://helm.sh/docs/intro/install/) yet, go ahead and do that.

Create a namespace in your Kubernetes cluster just for your Opstrace components:

```bash
kubectl create namespace opstrace
```

Next, you need to decide which Opstrace tenant you want to send metrics and logs to and then add that tenant's private key to Kubernetes.
If you choose the tenant "staging" (for example), create a file named `tenant-api-token-staging.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: tenant-api-token-staging
  namespace: opstrace
stringData:
  authToken: <PRIVATE_KEY_FOR_STAGING_TENANT>
```

To find your private key, look in the directory from which you created your Opstrace cluster.
There you will find a file called `tenant-api-token-staging`.
Copy that file's contents into the `authToken` field in `tenant-api-token-staging.yaml`.

Now add the private key to Kubernetes:

```bash
kubectl apply -f tenant-api-token-staging.yaml
```

Everything we do in this guide from here on out will assume a tenant called `staging`. Wherever you see `staging`--whether in file names or file contents--replace it with the tenant name you chose.

### Install Promtail

Add the Grafana project's Helm repository and update Helm:

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
```

Now create a file `promtail-values.yaml`:

```yaml
config:
  lokiAddress: https://loki.staging.<YOUR_OPSTRACE_CLUSTER_NAME>.opstrace.io/loki/api/v1/push
  snippets:
    extraClientConfigs: |
      bearer_token_file: /var/run/tenant-api-token-staging/authToken
    common:
      - action: replace
        source_labels:
          - __meta_kubernetes_pod_node_name
        target_label: node_name
      - action: replace
        source_labels:
          - __meta_kubernetes_namespace
        target_label: namespace
      - action: replace
        replacement: $1
        separator: /
        source_labels:
          - namespace
          - app
        target_label: job
      - action: replace
        source_labels:
          - __meta_kubernetes_pod_name
        target_label: pod
      - action: replace
        source_labels:
          - __meta_kubernetes_pod_container_name
        target_label: container
      - action: replace
        replacement: /var/log/pods/*$1/*.log
        separator: /
        source_labels:
          - __meta_kubernetes_pod_uid
          - __meta_kubernetes_pod_container_name
        target_label: __path__
      - action: replace
        replacement: /var/log/pods/*$1/*.log
        # See https://github.com/opstrace/customer-settlemint/issues/8#issuecomment-785043607
        # for more details on regex field override.
        regex: (.+)
        separator: /
        source_labels:
          - __meta_kubernetes_pod_annotation_kubernetes_io_config_hash
          - __meta_kubernetes_pod_container_name
        target_label: __path__

extraArgs:
  - -client.external-labels=cluster_name=test

extraVolumes:
  - name: tenant-api-token-staging
    secret:
      secretName: tenant-api-token-staging
extraVolumeMounts:
  - name: tenant-api-token-staging
    mountPath: /var/run/tenant-api-token-staging
    readOnly: true

# The default is to run only on master nodes.
tolerations: []
```

Add your Opstrace cluster name to `config.lokiAddress` at the top of the file, and replace `staging` with your tenant name.
Then, install Promtail to your Kubernetes cluster:

```bash
helm upgrade --install -f promtail-values.yaml promtail grafana/promtail --namespace opstrace
```

Wait a moment for the Pods to start up, then check that they are running:

```bash
kubectl get pods -n opstrace
```

You should see two Promtail pods with a status of `Running`.

Browse to `https://staging.<YOUR_OPSTRACE_CLUSTER_NAME>.opstrace.io/grafana`.
In the **Explore** window, select the **logs** data source and run this query:

```bash
{namespace="kube-system"}
```

You should see logs from pods running in the "kube-system" namespace.

### Install Prometheus

Add the following two Helm repositories:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add kube-state-metrics https://kubernetes.github.io/kube-state-metrics
```

And update Helm:

```bash
helm repo update
```

Now create a file named `prometheus-values.yaml`:

```yaml
server:
  remoteWrite:
    - url: https://cortex.staging.<YOUR_OPSTRACE_CLUSTER_NAME>.opstrace.io/api/v1/push
      bearer_token_file: /var/run/tenant-api-token-staging/authToken

      write_relabel_configs:
        # Choose a label that always exists to guarantee we get a match
        # which causes the replacement to occur. Because we don't specify
        # a match group the new label is added to the existing ones.
        - source_labels: [ __address__ ]
          target_label: cluster_name
          replacement: "test"

  extraSecretMounts:
    - name: tenant-api-token-staging
      mountPath: /var/run/tenant-api-token-staging
      subPath: ""
      secretName: tenant-api-token-staging
      readOnly: true

  resources:
    requests:
      memory: 2Gi
      cpu: 1

nodeExporter:
  enabled: true

kubeStateMetrics:
  enabled: true

alertmanager:
  enabled: false

pushgateway:
  enabled: false

serviceAccounts:
  alertmanager:
    create: false
  pushgateway:
    create: false
```

As with `promtail-values.yaml`, add your Opstrace cluster name in the proper spot, and replace all instances of `staging` with your own tenant name.

Then install Prometheus to your Kubernetes cluster:

```bash
helm upgrade --install -f prometheus-values.yaml prometheus prometheus-community/prometheus --namespace opstrace
```

Now in the **Explore** window in Grafana, select the **metrics** data source this time, and run a very simple query:

```bash
up
```

In Prometheus terms, an endpoint you can scrape is called an instance.
For each instance scraped, Prometheus stores a metrics sample called `up` with a value of 1.
You should see many instances of `up`.

## 3. Add Prometheus alerts for the Kubernetes cluster

For this step and the next, you are going to use the `kubernetes-monitoring/kubernetes-mixins` GitHub repo.
Clone the repo:

```bash
git clone https://github.com/kubernetes-monitoring/kubernetes-mixin && cd kubernetes-mixin
```

Install a few dependencies:

```bash
go get github.com/jsonnet-bundler/jsonnet-bundler/cmd/jb
brew install jsonnet
jb install
```

Then build the mixin:

```bash
make prometheus_alerts.yaml
make prometheus_rules.yaml
make dashboards_out
```

## 4. Add Grafana dashboards to your Opstrace cluster

When you built `kubernetes-mixin` in the previous step, it created some Grafana dashboard files.
Add each JSON file in `dashboards_out/` to your Opstrace cluster's Grafana by:

1. Mousing over **+**,
2. Clicking **Import**,
3. Pasting the JSON into the large text field,
4. Clicking **Load**, and
5. Clicking **Import**.


## 5. Add some Prometheus alerts and Grafana dashboards for your application
