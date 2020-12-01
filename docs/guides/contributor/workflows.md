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
```

Then create the cluster (choose provider and cluster name and config at will):

```bash
./build/bin/opstrace create [aws-or-gcp] [cluster-name] -c ci/cluster-config.yaml
```

Note: the container image push operations require Docker hub credentials.
There is no proper solution yet for external developers that do not have the corresponding credentials.
You might find a simple workaround using the file `packages/controller-config/src/docker-images.json`.


## Local checkout: quick iteration while changing the CLI

You can run `yarn watch:cli` for automatic and iterative `tsc`-compilation of the CLI and its dependencies.

In a separate terminal, you can then invoke the CLI via the `packages/cli/build/index.js` entry point. Example:

```text
node packages/cli/build/index.js create aws testcluster -c cluster-config.yaml
```

In almost all of the cases, this cluster creation attempt is then expected to fail with:

```text
...
2020-12-01T12:12:06.139Z info: check if docker image exists on docker hub: opstrace/controller:<tag>
...
error: docker image not present on docker hub: you might want to push that first
```

Why is that? It is essential to appreciate that this CLI build (not built by CI) cannot have awareness of a sane corresponding default for the `controller_image` parameter in the cluster configuration. Therefore, it is pointing to an image that usually does not exist on Docker Hub.

You might decide that all you need is to get a cluster running using the latest and greatest controller image built by CI, from `main`.
For achieving that, you can use a moving target image tag: `opstrace/controller:latest-main`. For example:

```text
$ cat cluster-config.yaml
controller_image: opstrace/controller:latest-main
tenants:
  - dev
node_count: 3
```


When you use this `cluster-config.yaml` for your testing/iteration effort, you can stop worrying about the "controller image does not exist" error.

Just note that _this_ controller image might not perfectly fit the CLI changes that you are testing: if your changes also affect the controller, you might have to go through the more time-consuming process involving `make build-and-push-controller-image` (see above) to achieve a sane outcome.
But at this point, you have certainly entered the "I know what I am doing" stage and know best what is needed and what the trade-offs are.


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
We're working through it slowly in [#51](https://github.com/opstrace/opstrace/issues/51).
PRs welcome!
