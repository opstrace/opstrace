# The `test-remote` suite of tests

Our so-called `test-remote` suite is located in `tests/test-remote`.
It is the main test suite for checking the validity of an Opstrace cluster's health and functionality.
We run this test suite regularly as part of CI for each code commit.

Architecturally, this test suite is designed to be executed locally on your machine for testing a remote Opstrace cluster through the Internet.

Most of the individual tests in this suite inspect cluster properties through the data API endpoints, i.e., from the user's (and their tooling's) point of view.
Other tests in this suite may inspect implementation details through private interfaces.

**WARNING: that this test suite is invasive. That is, never run it against a production cluster.**


## How to run `test-remote` against a remote cluster

The recommended way to run this test suite is via `make test-remote` executed at the root directory of the Opstrace repository.
This starts the individual test runner components as Docker containers.

Before invoking `make test-remote`, the environment in the current shell needs to be configured, as documented below.

First, set cluster name and cloud provider of the to-be-tested cluster:

```bash
export OPSTRACE_CLUSTER_NAME=<opstrace-cluster-name>
export OPSTRACE_CLOUD_PROVIDER=<aws or gcp>
```

Next up, make your local `kubectl` configuration point to the running cluster:

```bash
make kconfig
```

Now build or rebuild the container images that the test runner needs (can often be omitted, but if in doubt, run this):

```bash
make rebuild-testrunner-container-images
```

Now invoke the test runner with

```text
make test-remote
```

Follow the log output.

## How to write tests (advanced test runner invocation)

A property of `make test-remote` is that it picks up local changes to test code files.
That is, `make test-remote` can be used when modifying/developing tests locally.
However, note that the test runner container image and periphery container images need to be rebuilt for more certain changes:
For example, if you change `test/test-remote/package.json` you need to rebuild the test runner image with `make rebuild-testrunner-container-images`.

For larger test development tasks, you may want to run test code directly on your machine within an uncontainerized NodeJS runtime environment.
To that end, enter the test-remote NPM package directory and install the `test-remote` NPM package into your current NodeJS environment:

```text
cd test/rest-remote
yarn install
```

To execute the complete test suite, run the following command (with `test/test-remote` being the current working directory):

```text
yarn run mocha
```

To run a specific \(set of\) test\(s\), use a [Mocha test filter expression](https://mochajs.org/#command-line-usage).
Example:

```text
yarn run mocha --grep 'short'
```

Further notes for development and debugging:

* Mocha test \(suite\) teardown is, as of now, not always reliably executed.
A SIGINT-aborted test runner might leave resources behind, such as running child processes.
* Containerized applications \(e.g., FluentD\) and all kubectl processes leave behind their stdout/err data in the host's /tmp directory.
If things go wrong, look in the /tmp directory.
* About test isolation: cleanup does not need to be perfect yet, but please write tests so that they can be run arbitrarily often against the same cluster and still succeed, without relying on a previous test run's side effects to be present. That is, whenever a test inserts data, make it so so that the corresponding metrics or logs injected have unique/random properties (in a log stream label name, for instance).
