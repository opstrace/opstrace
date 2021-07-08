# Development environment

The reference build environment is the "CI container" as defined in `containers/ci`.
A native host environment probably deviates from this reference environment in various minor or major ways.
This document attempts to help setting up a local development environment that resembles that of the CI container.

Overview of requirements:

* Node 16+
* Yarn v1.x
* Go 1.16+
* Docker
* GCP and/or AWS CLIs (`gcloud`/`aws`)
* `make`
* `git`
* `golangci-lint`
* `markdownlint`

The sections below hopefully help with setting up some of these!

## TypeScript editor: use VSCode with ESLint

* Disable TSLint extension in VSCode.
* Enable ESLint extension in VSCode.
* Use the workspace settings as defined in the root of the repository.
* For the ESLint extension, use the default settings, in particular `eslint.codeActionsOnSave.mode` set to `all`. That way, we align on formatting.


## Manage NodeJS with NVM

Our recommendation is to use [NVM](https://github.com/nvm-sh/nvm) for managing NodeJS installations.
At the time of writing we are using NodeJS 16.x:

```bash
nvm install 16
nvm use 16
```

## Building locally

To build locally, visit our [Developer Workflows](./workflows.md#local-checkout-build-artifacts-and-create-a-cluster) page.

## Golang and dependencies

We are currently using Golang 1.15.
Go code is a small portion of our code base (under the `go/` directory), so this is not terribly important.

We use [golangci-lint](https://golangci-lint.run) to lint the Go codebase.
You'll need to [install](https://golangci-lint.run/usage/install/#local-installation) it and have it available in your PATH to run the pre-commit hooks locally.

You may need to set `GOPRIVATE` to be able to build the project in Visual Studio Code.
Also, you may want to use the following   the following in your `preferences.json` to configure the Go plugin.

```json
"go.toolsEnvVars": {
  "GO111MODULE": "on",
  "GOPRIVATE": "github.com/opstrace",
},
```

## Required commit sign-off

[Git commit sign-off](https://git-scm.com/docs/git-commit#Documentation/git-commit.txt---signoff) is required for all commits.

Opstrace is following the [Developer Certificate of Origin](https://developercertificate.org) process instead of requiring a CLA in order to reduce friction toward contributions. All git commits must be have an explicit sign-off asserting the contents of the DCO to pass our CI checks.
