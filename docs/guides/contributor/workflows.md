# Developer workflows

## Create a cluster from latest `main`

Our Continuous Integration (CI) setup performs periodic builds from the `main` branch.
When a build passed all tests then its corresponding artifacts are exposed as "latest from main".

Here is how to launch an Opstrace cluster based on such cutting edge build artifacts.
First, download and extract the CLI:

<!--tabs-->
### MacOS

```bash
curl -L https://go.opstrace.com/cli-latest-macos | tar xjf -
```

### Linux

```bash
curl -L https://go.opstrace.com/cli-latest-linux | tar xjf -
```

<!-- /tabs -->

Verify version and build date:

```bash
./opstrace --version --log-level=debug
```

Create the cluster (choose provider and cluster name and config at will):

```bash
./opstrace create [aws-or-gcp[ [choose-cluster-name] -c ci/cluster-config.yaml
```

## Local checkout: build artifacts, and create a cluster

Confirm that the working directory is the root of the `opstrace/opstrace` repository checkout.
It may contain local modifications (which is the point of this section).

First, build the CLI as well as container images:

```bash
make cli
make build-and-push-controller-image
make build-and-push-app-image
```

Then create the cluster (choose provider and cluster name and config at will):

```bash
./build/bin/opstrace create [aws-or-gcp] [cluster-name] -c ci/cluster-config.yaml
```

Note: the container image push operations require Docker hub credentials.
There is no proper solution yet for external developers that do not have the corresponding credentials.
You might find a simple workaround using the file `packages/controller-config/src/docker-images.json`.

## Run the `test-remote` suite against a remote cluster

See [the `test-remote` suite of tests](./test-remote), a document dedicated to this test suite.

## Create a cluster, but run the controller locally

For controller development it can be helpful to create an Opstrace cluster and have the controller running on your local machine.

1. Use the `--hold-controller` argument upon cluster creation: `opstrace create ... [cluster-name] --hold-controller`
2. `make kconfig-aws` or `make kconfig-gcp`: adjust the local kubeconfig to the newly created k8s cluster.
3. Run the controller locally, with the `--external` flag: `node ./packages/controller/build/cmd.js --external [cluster-name]

## Linting code and docs

### Documentation: `make lint-docs`

For linting our documentation, we use [Markdownlint](./docs/contributing/writing-docs.md#get-on-your-marks), with rules defined in `.markdownlint.json` in the project root.

Here is an example of executing the command and a resulting error thrown from Markdownlint:

```text
$ make lint-docs
...
yarn run markdownlint 'docs/**/*.md'
yarn run v1.22.10
$ markdownlint 'docs/**/*.md'
docs/guides/contributor/workflows.md:76:40 MD047/single-trailing-newline Files should end with a single newline character
error Command failed with exit code 1.
```

### Code: `make lint-codebase`

Some parts of the code base are not covered by proper linting yet.
We're working through it slowly in [#875](opstrace-prelaunch/issues/875).
PRs welcome!
