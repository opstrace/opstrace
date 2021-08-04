---
description: The answers to some of the most common questions we hear.
---

# Frequently Asked Questions

## How are you different?

We are different because we are not focused on building a new storage backend or building a proprietary SaaS.
We’re trying to make open source observability easier, more accessible, and more effective by building an open source distribution that _you_ can run (in your own account) just as easily as a SaaS is to use.
Basically, this is how we wanted to do open source observability when we were in your shoes.
There are many benefits to this—not least of which is cost management—so [follow our blog](https://go.opstrace.com/blog) to keep up to date.

## How does this work with—or replace—my existing Prometheus?

Opstrace is essentially a horizontally scalable, highly available Prometheus that uses S3 for inexpensive long-term storage.
If you're already using Prometheus, it's very easy to get started with Opstrace.
As shown in our [docs](../guides/user/sending-metrics-with-prometheus.md#remote_write-configuration-block-the-basics), all you need to do is add a couple of lines to your Prometheus configuration and your data will also be sent securely to the Opstrace cluster.
One great advantage is that you may be able to reduce the footprint of your Prometheus instance, as all long-term storage is now safely done by a [Cortex](https://github.com/cortexproject/cortex) instance in your S3 buckets.

## Can I run this on my own Kubernetes cluster?

Your Opstrace instance is best kept separate from the infrastructure its meant to monitor.
Instead of requiring you provision a separate Kubernetes cluster just for Opstrace, we do that for you.
The way Opstrace works is that it talk directly to cloud provider APIs in order to install Opstrace in your account.
(Initially, we did look at Pulumi and Terraform, but at the time the overhead of those general systems for such a purpose-built system such as Opstrace did not seem like a good return on investment\*.)
The three main points for why we do not currently support bringing your own Kubernetes cluster:

1. Monitoring is special and needs to be isolated from your normally provisioned platform. You don't want to lose your monitoring when there is an outage of your other infrastructure components.
2. We do not want to provide Helm charts, because even if you did create a dedicated Kubernetes cluster for Opstrace you then have to operate everything that is created.  We aim to provide a SaaS-like system that you do not have to operate by writing (open source) code of our own to manage the running system.
3. Guarantees are hard to provide if we do not build and test the system end-to-end; by controlling the cloud resources directly ourselves we can minimize variables that may compromise this process.  In this way, we can provide high-confidence assertions about the behavior of our product.

However, we do have a Cortex Operator that you can use to run Cortex on your own Kubernetes cluster if you want to, but that will not incorporate any of the other Opstrace features.
Check it out on GitHub here: [https://github.com/opstrace/cortex-operator](https://github.com/opstrace/cortex-operator).

We are intentionally building a composed product that is operated in a uniform way, rather than relying on you to stitch together the individual components.
Opstrace intends to replace the many in-house stacks that people at countless companies have already built.

\* *As with most decisions, we may reconsider this at some point in the future.*

## How do I use my own domain?

Our `*.opstrace.io` domain is provided to our users for free as a convenience.
To use a custom domain, check out our documentation [here](https://opstrace.com/docs/references/configuration#custom_dns_name).

## How do I connect to my single sign-on provider, such as Okta?

The built-in Auth0 authentication is provided to our users for free as a convenience.
Users can configure their own Auth0 application, as [described in our docs](https://opstrace.com/docs/references/configuration#custom_auth0_client_id).
To freely configure alternative single sign-on providers, [email us](mailto:hello@opstrace.com) to chat.
