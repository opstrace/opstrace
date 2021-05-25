---
description: The answers to some of the most common questions we hear.
---

# Frequently Asked Questions

## How are you different?

We are different because we are not focused on building a new storage backend or building a proprietary SaaS.
We’re trying to make open source observability easier, more accessible, and more effective by building an open source distribution that _you_ can run (in your own account) just as easily as a SaaS is to use.
Basically, this is how we wanted to do open source observability when we were in your shoes.
There are many benefits to this—not least of which is cost management—so [follow our blog](https://opstrace.com/blog) to keep up to date.

## How does this work with—or replace—my existing Prometheus?

If you're already using Prometheus, it's very easy to get started with Opstrace.
As shown in our [docs](../guides/user/sending-metrics-with-prometheus.md#remote_write-configuration-block-the-basics), all you need to do is add a couple of lines to your Prometheus configuration and your data will also be sent securely to the Opstrace cluster.
One great advantage is that you may be able to reduce the footprint of your Prometheus instance, as all long-term storage is now safely done by a [Cortex](https://github.com/cortexproject/cortex) instance in your S3 buckets.

## Can I run this on my own Kubernetes cluster?

In order to provide a reliable experience for Opstrace, we control the entire infrastructure from end to end.
Your Opstrace cluster is best kept separate from the infrastructure its meant to monitor.
We do have a Cortex Operator that you can use to run Cortex on your own.
Check it out on GitHub here: [https://github.com/opstrace/cortex-operator](https://github.com/opstrace/cortex-operator).

## How do I use my own domain?

Our `*.opstrace.io` domain is provided to our users for free as a convenience.
To use a custom domain, [email us](mailto:hello@opstrace.com) about our commercial version.

## How do I connect to my single sign-on provider, such as Okta?

The built-in authentication is provided to our users for free as a convenience.
To freely configure single sign-on [email us](mailto:hello@opstrace.com) about our commercial version.
