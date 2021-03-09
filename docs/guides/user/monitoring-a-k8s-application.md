# Monitoring an Application Running in Kubernetes

In this guide we will show you how to monitor an application running in Kubernetes using your Opstrace cluster.
We will:

1. Create a Kubernetes cluster if you don't already have one.
2. Deploy Prometheus and Promtail to Kubernetes using Helm.
These will let us collect metrics and logs about Kubernetes and any apps running on it.
3. Add some Prometheus alerts for the Kubernetes cluster.
4. Add some Grafana dashboards to your Opstrace cluster to let you visualize the health of your Kubernetes cluster.
5. Add some Prometheus alerts and Grafana dashboards for your application as well.

## Prerequisites

* An Opstrace cluster and its tenant authentication token (for the tenant of your choice). Follow our [Quick Start](../../quickstart.md) if you don't have a cluster yet.
* [Helm](https://helm.sh/docs/intro/install/).

You don't need to have a Kubernetes cluster already, but if you do have one, great--you can use that.
We will show you how to monitor the cluster and an application running on it.

