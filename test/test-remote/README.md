# test-remote

Opstrace test suite to be run against a remote Opstrace cluster.

This README is relevant for developing tests.

Concept:

* `test-remote` is the name of this test runner.
* `test-remote` requires `kubectl` to be configured against a specific remote Opstrace cluster:
  * it uses `kubectl port-forward ...` to connect to individual [Kubernetes network services](https://kubernetes.io/docs/concepts/services-networking/service) in the remote cluster to communicate with them.
  * it deploys [alerting tools](https://github.com/grafana/cortex-tools/blob/main/docs/e2ealerting.md) into the cluster for end-to-end testing alerts.
* `test-remote` is a [MochaJS](https://mochajs.org)-based test runner executed by the NodeJS runtime.


## Containerized execution: `make test-remote`

One way to run `test-remote` is from within a Docker container.
That is what `make test-remote` does (when invoked in the root directory of the Opstrace repository).
This method is also used by the buildkite CI:
running `make test-remote` locally is supposed to be equivalent to what CI does (except for minor platform differences).

A neat property of `make test-remote` is that it picks up local changes to test code files.
That is, `make test-remote` can be used when modifying/developing tests locally.
However, note that the test runner container image as well as periphery container images need to be rebuilt for more fundamental changes.
For example, a change to `test/test-remote/package.json` must be followed by rebuilding the test runner image (`make rebuild-testrunner-container-images` helps with that).


## How to develop

This section explains how to run the (modified) test code directly on your machine within an uncontainerized NodeJS runtime (this is how I started building the test runner and this is how I make bigger changes to it).

Enter the `test-remote` NPM package directory:

```bash
cd test/rest-remote
```

Install the `test-remote` NPM package dependencies based on the current state of `package.json`:

```bash
yarn
```

Make test code modifications if desired.
While doing so you can have `tsc` watch your changes, and give you real-time compilation feedback. I do that via

```
export NODE_OPTIONS=--max_old_space_size=5000 && yarn run tsc --watch
```


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

For 'proper' auto-formatting of code, use VSCode with the ESLint extension and use the default settings, in particular `eslint.codeActionsOnSave.mode` set to `all`.

## Notes

* Each test must be written so that it can be run arbitrarily often against the same cluster and still succeed.
  That usually means that metrics or logs injected into the Opstrace cluster must have unique properties.

* Mocha test (suite) teardown is as of now not always reliably executed.
  A SIGINT-aborted test runner might leave resources behind such as running child processes.

* Containerized applications (e.g. FluentD) but also all `kubectl` processes leave behind their stdout/err data in the host's `/tmp` directory. This is the place to look if things go wrong.

Tooling:

* The test runner is built using the [MochaJS](https://mochajs.org) framework.
* For HTTP interaction the [got](https://github.com/sindresorhus/got) HTTP client is used.


## Architecture overview

The following picture clarifies that

* the (optionally containerized) test runner itself manages Docker containers.
* the connectivity between the test runner and k8s services in the Opstrace instance is (sometimes) established via `kubectl`-based port-forwards.

In addition to `kubectl`-based port-forwards (and what's not shown in the figure), there is a whole lot of network communication going on between the test runner and the regular network endpoints of the Opstrace instance (usually HTTP(S) endpoints exposed to the Internet, requiring authentication state).

![test-remote-overview_04.png](https://opstrace-figures.s3-us-west-2.amazonaws.com/test-remote-overview_04.png "architecture overview image")