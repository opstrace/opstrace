<!-- markdownlint-disable MD041 -->
<!-- markdownlint-disable MD033 -->

# Opstrace Introduction

 _**A secure observability platform, deployed in your own network.**_

## What does it do?

Opstrace automates the creation and management of a secure, horizontally-scalable metrics and logs platform.
It consists of an installer that runs as a CLI to use your cloud credentials to provision and configure an Opstrace cluster in your account, as well as internal components that manage its ongoing lifecycle (repairing and updating components as needed).

## How does it work?

Opstrace clusters expose a horizontally scalable [Prometheus](https://prometheus.io) API, backed by [Cortex](https://github.com/cortexproject/cortex), and a [Loki](https://github.com/grafana/loki) API for logs collection.
You can point your existing Prometheus or [FluentD](https://fluentd.org)/[Promtail](https://github.com/grafana/loki/blob/master/docs/sources/clients/promtail/_index.md) instances to it.
We also plan to support a wide variety of other APIs, such as the Datadog agent.

Creating an Opstrace Cluster requires our [command-line interface](./references/cli.md), which talks directly to your cloud provider.
It orchestrates the tedious process of setting everything up.
After your cluster is running, our Controller inside the cluster will maintain things over time.
All of your data resides safely (and inexpensively) in your own S3 buckets.

Frequently whole teams take weeks or months to set up a stack like this, and then it's an ongoing maintenance headache.
And even if a team does all of this, they often skimp on certain critical aspects of configuration, such as exposing API endpoints securely.

Opstrace does all of that for you.
It looks a little something like this...

![high-level overview](https://share.balsamiq.com/c/kaP69UqhbdMMmzaaHB8u1a.png)

## How can I use it?

First, give our [Quick Start](./quickstart.md) a try.

Then you can check out our three guides on the left—User, Administrator, and Contributor—for more details on how to create and use an Opstrace cluster.

See also [Key Concepts](./references/concepts.md) to understand the core concepts of an Opstrace cluster.

Missing something?  Check out our [issues](https://go.opstrace.com/gh) to see if it's planned, and if not, [submit a proposal](https://go.opstrace.com/proposal) and/or contact us in our [community discussions](https://go.opstrace.com/community).
