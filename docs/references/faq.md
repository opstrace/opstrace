---
description: Get to know Opstrace through the most frequently asked questions.
---

# Frequently Asked Questions

## What is Opstrace?

Opstrace is the only complete, open-core observability platform.
We bundle and extend the best-of-breed open source solutions so you can focus more on what matters—your own business.

## Why would I use Opstrace instead of Prometheus + Grafana?

Opstrace provides a simpler administrative interface as well as advanced features such as reliable, long-term storage.
Many people install and operate these open source projects themselves, but it takes a lot of effort—Opstrace simplifies all of this.

## Is this production-ready?

Not yet, but we're working on it.
Opstrace is currently a preview release.
We hope feedback and contributions from the community will help accelerate this goal.

## How do I use my own DNS?

Our `*.opstrace.io` domain is provided as a convenience to users as a fast method for getting started.
However, we do understand that you will want to use your own domain for production purposes.
This is an enterprise feature, so if you are interested please email us at <hello@opstrace.com>.

## Can I use the Kubernetes orchestration components on their own?

Not at this time.
Although we may productize this work in the future, that is not currently planned.
Let us know what you think in our [GitHub Discussions](https://go.opstrace.com/community).

## Can I use the UI standalone?

Not at this time.
The Opstrace UI is intended to be the centerpiece of our platform, and may not always maintain compatibility with existing APIs.

## Will Opstrace always be open source?

Yes! We believe in the power of open source communities.
In the past, we've both benefited from them and contributed to them, and feel strongly that this model promotes success for everyone involved.
However, Opstrace _will_ have some commercial component targeted toward commercial buyers who have specific needs.

## If I already have a Kubernetes cluster, can I use that instead?

We use your cloud provider's hosted Kubernetes offering to fully orchestrate our workflows; it's part of what makes Opstrace reliable—we control all parts of the stack.
Instead of thinking "can I use my existing k8s cluster," think "I am installing Opstrace somewhere on my network, over which I have full control... unlike our former big SaaS provider."
