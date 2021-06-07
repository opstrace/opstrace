<!-- markdownlint-disable MD041 -->
<!-- markdownlint-disable MD033 -->

![Build status](https://badge.buildkite.com/df9e995b3a5e4b0bebce8b432b0bf48b092fd261b7017b65c1.svg)
[![License](https://img.shields.io/github/license/opstrace/opstrace)](LICENSE)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-v2.0%20adopted-ff69b4.svg)](CODE_OF_CONDUCT.md)

<img src="https://user-images.githubusercontent.com/19239758/97793010-00161b00-1ba3-11eb-949b-e62eae6fdb9c.png" width="350">

# The Open Source Observability Distribution

Opstrace is secure, horizontally-scalable, open source observability installed in your cloud account.
It combines open APIs to reduce toil.

Highlights:

* Horizontally **scalable** for ingestion and queries.
* Durable with inexpensive **long-term** retention.
* Rigoriously **tested** end-to-end.
* Large efforts towards confident **upgrades**.
* **Secure** by default with TLS and authenticated endpoints.
* **Easy to configure** with GUIs and APIs.

We walk on the shoulders of giants; Opstrace uses open source projects you know and love in one place:

* [Cortex](https://github.com/cortexproject/cortex)
* [Loki](https://github.com/grafana/loki)
* [Grafana](https://github.com/grafana/grafana)
* [Prometheus](https://github.com/prometheus/prometheus)
* [Kubernetes](https://github.com/kubernetes/kubernetes)
* and many more

## Key Features

### Installation and Upgrades

Both installation and upgrades are initiated by a single CLI command.
In this example, you can see an abbreviated installation and upgrade cycle:

```bash
$ cat << EOF > config.yaml
 tenants:
  - staging
  - prod
EOF

$ ./opstrace create aws tracy -c config.yaml
...
info: cluster creation finished: tracy (aws)
info: Log in here: https://tracy.opstrace.io

# a week later...

$ curl -L https://go.opstrace.com/cli-latest-release-macos | tar xjf -
$ ./opstrace upgrade aws tracy -c config.yaml
...
info: Opstrace cluster upgrade done for tracy (aws)
```

### Alert Management

Alertmanager can be difficult to configure, especially [for Cortex](https://cortexmetrics.io/docs/architecture/#alertmanager) where they correspond with tenants you have created.
Our goal is to improve this with editors that provide realtime validation feedback:

![alertmanager configuration ui](https://p95.p4.n0.cdn.getcloudapp.com/items/eDuy9lnR/1a7a1030-4b27-4dfc-bf52-774f9f61d365.jpg?v=d0e8968befa6e0e3e1922594e61f9189)

### Tenant Management

[Tenants](docs/references/concepts.md#tenants) provide isolation for logically separate entities.
For example, they enable authn/authz for groups of users (e.g., different teams) and provide rate limiting of your data on both the write and read paths.
A central UI can be helpful for visualizing and [managing multiple tenants](docs/guides/administrator/managing-tenants.md):

![tenants can be managed holistically](https://p95.p4.n0.cdn.getcloudapp.com/items/4gunxZZe/0d056830-92be-4417-aa90-21c8fa261f48.jpg?source=viewer&v=3ce7d21798ba7cf02869e35dfcfa70c6)

## Quick Start

Install Opstrace in your own cloud account with our [quick start](https://go.opstrace.com/quickstart).
The Opstrace CLI uses your local credentials to setup the necessary cloud resources (e.g., a EKS or GKE cluster) and then deploys the Opstrace controller which orchestrates all of the app-level deployments.
For example:

```bash
opstrace create aws <choose_a_name> <<EOF
tenants:
  - dev
  - staging
  - prod
env_label: try_opstrace
cert_issuer: letsencrypt-prod
EOF
```

In addition to AWS we also support GCP.

See our configuration reference for details: [docs/references/configuration.md](docs/references/configuration.md).

Don't forget to clean up if you're done kicking the tires:

```bash
opstrace destroy aws <choose_a_name>
```

## Community

Authentic collaboration in a community setting is important to us.
Please join us to learn more, get support, or contribute to the project.

* Join our [Slack Community](https://go.opstrace.com/community)
* Ask a question in our [GitHub Discussions](https://github.com/opstrace/opstrace/discussions)
* Contribute a [proposal](https://github.com/opstrace/opstrace/issues/new?assignees=&labels=thinktank:%20proposal&template=2-proposal.md&title=) or a [bug report](https://github.com/opstrace/opstrace/issues/new?assignees=&labels=type:%20bug&template=1-bug_report.md&title=)
* Or just send us an email at [hello@opstrace.com](mailto:hello@opstrace.com)

You can find out more on [our community page](https://opstrace.com/community), including shoutouts to some of the main open source projects that we're building with.

## Documentation

You can find the Opstrace documentation in [/docs](./docs).
We invite you to improve these docs together with us, and have a [corresponding guide](./docs/guides/contributor/writing-docs.md) for that.

## Contributing

We :heart: working on open source projects, and we hope you do too.
Please join us and make some contributions, however big or small.

* Start by reading the [Contributing guide](./CONTRIBUTING.md) to become familiar with the process.
* Then review our [Development guide](./docs/guides/contributor/setting-up-your-dev-env.md) to learn how to set up your environment and build the code.
* If you'd like to find a place to start and get your feet wet, just reach out and ask in [our community Slack](https://go.opstrace.com/community). (It's also a good idea to try out our [quick start](https://go.opstrace.com/quickstat).)

Take a look at our [high-level roadmap](./docs/references/roadmap.md) to see where we're heading, and feel free to [get in touch](https://go.opstrace.com/community) with us regarding questions and suggestions.

IMPORTANT NOTE: We welcome contributions from developers of all backgrounds.
We encode that in a [Contributor Code of Conduct](CODE_OF_CONDUCT.md).
By participating in this project, you agree to abide by its terms.

# Privacy

At Opstrace, we host a service that automatically provisions subdomains like `<my_name>.opstrace.io`.
This makes it easy and clean to use the URLs for both humans and machines.
To accomplish this safely, we require login via Auth0 subject to our [privacy poicy](https://go.opstrace.com/privacy-policy).

Get in touch with us to discuss support for custom domains!

## Security Reports

We take security seriously.
If you believe you have found a security issue in our project or any related projects, please email us at [security@opstrace.com](mailto:security@opstrace.com) to responsibly disclose the issue.
