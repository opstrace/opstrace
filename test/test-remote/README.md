# test-remote

Opstrace cluster test suite. To be run against a remote opstrace cluster.

Reference instructions for how to run the test runner against a remote cluster can be found in our [main README](https://github.com/opstrace/opstrace/blob/main/Readme.md).

This README is relevant for developing tests.

Concept:

* `test-remote` is the name of this test runner.
* `test-remote` requires `kubectl` to be configured against a specific remote opstrace cluster:
  - it uses `kubectl port-forward ...` to connect to individual [Kubernetes network services](https://kubernetes.io/docs/concepts/services-networking/service/) in the remote cluster to communicate with them.
  - it deploys [test harnesses](https://github.com/grafana/cortex-tools/blob/main/docs/e2ealerting.md) into the cluster to interact with cluster alerts
* `test-remote` is executed by the NodeJS runtime and -- for separation of concerns -- is set up as an isolated NPM package; defined by the directory that this README resides in.

## Architecture overview

![test-remote-overview_04.png](https://opstrace-figures.s3-us-west-2.amazonaws.com/test-remote-overview_04.png "architecture overview image")

## `make test-remote`

One way to run `test-remote` is from within a Docker container.
That is what `make test-remote` does (when invoked in the root directory of the opstrace repository).
This method is also used by the buildkite CI:
running `make test-remote` locally is equivalent to what CI does (except for minor platform differences).

A neat property of `make test-remote` is that it picks up local changes to test code files.
That is, `make test-remote` can be used when modifying/developing tests locally.
However, note that the test runner container image as well as periphery container images need to be rebuilt for more fundamental changes.
For example, a change to `test/test-remote/package.json` must be followed by rebuilding the test runner image (`make rebuild-testrunner-container-images` helps with that).

## How to run test-remote directly (uncontainerized)

This section explains how to run the (modified) test code directly on your machine within an uncontainerized NodeJS runtime (this is how I started building the test runner and this is how I make bigger changes to it).

Enter the `test-remote` NPM package directory:

```bash
cd test/rest-remote
```

Install the `test-remote` NPM package based on the current state of `package.json`:

```bash
yarn install
```

Make test code modifications if desired.

Make sure that `kubectl` is configured against a remote Opstrace cluster (e.g., `make kconfig`).

Execute the (complete) test suite with

```bash
yarn run mocha
```

You can also run a specific (set of) test(s) with the help of a Mocha test filter expression. Example:

```bash
yarn run mocha --grep 'short'
```

Also see [Mocha command line interface docs](https://mochajs.org/#command-line-usage).

## Notes

* Each test must be written so that it can be run arbitrarily often against the same cluster and still succeed.
  That usually means that metrics or logs injected into the opstrace cluster must have unique properties.

* Mocha test (suite) teardown is as of now not always reliably executed.
  A SIGINT-aborted test runner might leave resources behind such as running child processes.

* Containerized applications (e.g. FluentD) but also all `kubectl` processes leave behind their stdout/err data in the host's `/tmp` directory. This is the place to look if things go wrong.

Tooling:

* The test runner is built using the [MochaJS](https://mochajs.org/) framework.
* For HTTP interaction the [got](https://github.com/sindresorhus/got) HTTP client is used.
