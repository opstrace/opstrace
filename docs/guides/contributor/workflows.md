# Developer workflows

## Create an instance from latest `main`

Our Continuous Integration (CI) setup performs periodic builds from the `main` branch.
When a build passed all tests then its corresponding artifacts are exposed as "latest from main".

Here is how to launch an Opstrace instance based on such cutting edge build artifacts.
First, download and extract the CLI:

<!--tabs-->
### MacOS

```bash
curl -L https://go.opstrace.com/cli-latest-release-macos | tar xjf -
```

### Linux

```bash
curl -L https://go.opstrace.com/cli-latest-release-linux | tar xjf -
```

<!-- /tabs -->

Verify version and build date:

```bash
./opstrace --version --log-level=debug
```

Create the instance (choose provider and instance name and config at will):

```bash
./opstrace create [aws-or-gcp[ [choose-cluster-name] -c ci/cluster-config.yaml
```

## Local checkout: build artifacts, and create a instance

Confirm that the working directory is the root of the `opstrace/opstrace` repository checkout.
It may contain local modifications (which is the point of this section).

First, build the CLI as well as container images:

```bash
make cli
make build-and-push-controller-image
```

Then create the instance (choose provider and instance name and config at will):

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
node packages/cli/build/index.js create aws test -c config.yaml
```

In almost all of the cases, this instance creation attempt is then expected to fail with:

```text
...
2020-12-01T12:12:06.139Z info: check if docker image exists on docker hub: opstrace/controller:<tag>
...
error: docker image not present on docker hub: you might want to push that first
```

Why is that? It is essential to appreciate that this CLI build (not built by CI) cannot have awareness of a sane corresponding default for the `controller_image` parameter in the instance configuration. Therefore, it is pointing to an image that usually does not exist on Docker Hub.

You might decide that all you need is to get a instance running using the latest and greatest controller image built by CI, from `main`.
For achieving that, you can use a moving target image tag: `opstrace/controller:latest-main`. For example:

```text
$ cat config.yaml
controller_image: opstrace/controller:latest-main
tenants:
  - dev
```

When you use this `config.yaml` for your testing/iteration effort, you can stop worrying about the "controller image does not exist" error.

Just note that _this_ controller image might not perfectly fit the CLI changes that you are testing: if your changes also affect the controller, you might have to go through the more time-consuming process involving `make build-and-push-controller-image` (see above) to achieve a sane outcome.
But at this point, you have certainly entered the "I know what I am doing" stage and know best what is needed and what the trade-offs are.


## Run the `test-remote` suite against a remote instance

See [the `test-remote` suite of tests](https://github.com/opstrace/opstrace/tree/main/test/test-remote), a document dedicated to this test suite.

## Create an instance, but run the controller locally

For controller development it can be helpful to create an Opstrace instance and have the controller running on your local machine. This allows much faster turnaround when working on the controller locally, since you can avoid needing to build and upload the controller docker image with every change.

1. Use the `--hold-controller` argument upon instance creation: `opstrace create ... [cluster-name] --hold-controller`
2. `make kconfig-aws` or `make kconfig-gcp`: adjust the local kubeconfig to the newly created Kubernetes cluster.
3. Run the controller locally, with the `--external` flag: `node ./packages/controller/build/cmd.js --external [cluster-name]`

## Linting code and docs

### Documentation: `make lint-docs`

For linting our documentation, we use [Markdownlint](./writing-docs.md#get-on-your-marks), with rules defined in `.markdownlint.json` in the project root.

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


### License headers: `make check-license-headers`

Opstrace CI runs `make check-license-headers` to see if you maybe try to add (a) new code file(s) to the repository without setting the expected license header.
You can run `make check-license-headers` locally -- it is expected to modify relevant source files in place, in your current checkout (you can then review the changes, and commit them if they look good).

We follow [Google's guidance](https://opensource.google/docs/copyright) for expressing copyright in each source file.
If you do not work for Opstrace, you may assert your copyright in the license of each file you contribute to by following the guidance from the [Apache License, Version 2](https://www.apache.org/licenses/LICENSE-2.0#apply).
