---
description: The answers to some of the most common questions we hear.
---

# Frequently Asked Questions

## How does this work with—or replace—my existing Prometheus?

If you're already using Prometheus, it's very easy to get started with Opstrace.
As shown in our [docs](./sending-metrics-with-prometheus.md#remote_write-configuration-block-the-basics), all you need to do is add a couple of lines to your Prometheus configuration and your data will also be sent securely to the Opstrace cluster.
One great advantage is that you may be able to reduce the footprint of your Prometheus instance, as all long-term storage is now safely done by a [Cortex](https://github.com/cortexproject/cortex/) instance in your S3 buckets.

## Can I run this on my own Kubernetes cluster?

In order to provide a reliable experience, we control the entire infrastructure from end to end.
Your Opstrace cluster is best kept separate from the infrastructure its meant to monitor.
Running Opstrace on your own Kubernetes cluster would defeat the purpose by putting the burden of resource management and operations on your own team.

## Can I use this in production?

Opstrace is currently released as early access.
We wanted to get it out to the public as soon as it had enough to be useful to some people.

## How do I use my own domain?

Our `*.opstrace.io` domain is provided to our users for free as a convenience.
To use a custom domain, [email us](mailto:hello@opstrace.com) about our commercial version.

## How do I connect to my single sign-on provider, such as Okta?

The built-in authentication is provided to our users for free as a convenience.
To freely configure single sign-on [email us](mailto:hello@opstrace.com) about our commercial version.

## How is your commercial version priced?

Just because you send more and more data to the Opstrace cluster doesn't mean you should pay us more.
We charge a flat _per-user_ price.
Because we make money by people who gain value from our platform, we are therefore highly aligned with our users to be both transparent about the overall costs and to work to drive down those costs (which is typically dominated by storage).
