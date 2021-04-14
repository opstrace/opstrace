<!-- markdownlint-disable MD041 -->
<!-- markdownlint-disable MD033 -->

[![Build status](https://badge.buildkite.com/df9e995b3a5e4b0bebce8b432b0bf48b092fd261b7017b65c1.svg)](https://buildkite.com/opstrace/scheduled-main-builds)
[![License](https://img.shields.io/github/license/opstrace/opstrace)](https://github.com/opstrace/opstrace/blob/main/LICENSE)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-v2.0%20adopted-ff69b4.svg)](CODE_OF_CONDUCT.md)

<img src="https://user-images.githubusercontent.com/19239758/97793010-00161b00-1ba3-11eb-949b-e62eae6fdb9c.png" width="350">

# Secure observability, deployed in your own network

Opstrace deploys secure, horizontally-scalable open source observability in your cloud account, combining open APIs with a simple user experience.
Opstrace is:

* Horizontally scalable for ingestion and queries.
* Durable with inexpensive long-term retention.
* Tested end-to-end, freqently.  
* Secure by default with TLS and authenticated endpoints.
* Easy to configure with new web interfaces and APIs.
* All the open source projects you know and love in one place.

## Quick Start

Install Opstrace in your own cloud account with our [quick start](https://go.opstrace.com/quickstart).

```bash
opstrace create aws <choose_a_name> <<EOF
tenants:
  - dev
  - staging
  - prod
env_label: try_me
cert_issuer: letsencrypt-prod
EOF
```

We also support `gcp`.
See our configuration reference for details: [docs/references/cluster-configuration.md](docs/references/cluster-configuration.md).

Don't forget to clean up when you're done:

```bash
opstrace destroy aws <choose_a_name>
```

## Community

Authentic collaboration in a community setting is important to us.
Please join us to learn more, get support, or contribute to the project.

* Join our [Slack Community](https://go.opstrace.com/community)
* Chat with us in our [GitHub Discussions](https://github.com/opstrace/opstrace/discussions)
* Contribute a [proposal](https://github.com/opstrace/opstrace/issues/new?assignees=&labels=thinktank:%20proposal&template=2-proposal.md&title=) or a [bug report](https://github.com/opstrace/opstrace/issues/new?assignees=&labels=type:%20bug&template=1-bug_report.md&title=)
* Or just send us an email at [hello@opstrace.com](mailto:hello@opstrace.com)

You can find out more on [our community page](https://opstrace.com/community), including shoutouts to some of the main open source projects that we're building with.

## Documentation

You can find the Opstrace documentation in [/docs](/docs).
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
To accomplish this safely, we require login via oauth subject to our [privacy poicy](https://go.opstrace.com/privacy-policy).

Get in touch with us to discuss support for custom domains!

## Security Reports

We take security seriously.
If you believe you have found a security issue in our project or any related projects, please email us at [security@opstrace.com](mailto:security@opstrace.com) to responsibly disclose the issue.
