# Opstrace Command Line Interface (CLI) Reference

This document provides reference information about the Opstrace cluster management command line interface (CLI).

## Commands

Note: please also use the `--help` switch to discover additional reference information that the CLI emits about itself.

### `create`

Creates a new Opstrace cluster.

Example (for creating a cluster named `testcluster` in AWS):

```text
./opstrace create aws testcluster -c config.yaml
```

Help text:

```text
$ ./opstrace create --help
usage: opstrace create [-h] [--log-level LEVEL] [-c CONFIG_FILE_PATH] [--yes]
                       [--hold-controller]
                       PROVIDER CLUSTER_NAME

positional arguments:
  PROVIDER              The cloud provider to act on (aws, gcp).
  CLUSTER_NAME          The Opstrace cluster name ([a-z0-9-_], no more than
                        13 characters).

optional arguments:
  -h, --help            show this help message and exit
  --log-level LEVEL     Set log level for output on stderr. One of: debug,
                        info, warning, error. Default: info
  -c CONFIG_FILE_PATH, --cluster-config CONFIG_FILE_PATH
                        File path to cluster config document (YAML). Read
                        from stdin otherwise.
  --yes                 Automatic yes to prompts; assume 'yes' as answer to
                        all prompts andrun non-interactively
  --hold-controller     Do not deploy controller into k8s cluster (for
                        development purposes).
```

Notes:

* Cloud provider and cluster name are not part of the cluster configuration document.
That means that the same cluster configuration document can be re-used across cloud providers and also across clusters with different names.
* The `create` operation has internal timeout and retry logic.
  Unless you know better, it makes sense to keep this procedure running.
* When the `create` operation detects a problem that needs to be resolved through human intervention then it does not necessarily error out immediately.
  Instead, it presents the problem through its logs, retries periodically, and waits for you to take action behind the scenes.
  For example, when a cloud resource can't be created as of a quota error then you can infer that from the CLI's log output and can take action while the CLI keeps retrying.
  If you do not take action, the `create` operation will time out eventually.
* For some permanent, non-retryable errors the `create` operation will exit immediately, providing a clear error message.
* When the `create` operation errors out expectedly or unexpectedly or when you interrupt it manually (for instance, by sending `SIGINT` via `Ctrl+C`) then you can safely re-run it.
  It is designed to pick up the work where it was left.

### `destroy`

Tear down an existing Opstrace cluster.

Example (for tearing down a cluster named `testcluster` in AWS):

```text
./opstrace destroy aws testcluster
```

In the happy case, no input beyond cloud provider and cluster name is needed.
However, in certain ambiguous cases the CLI may ask for the `--region` argument

Help text:

```text
$ ./opstrace destroy --help
usage: opstrace destroy [-h] [--log-level LEVEL] [--yes] [--region REGION]
                        PROVIDER CLUSTER_NAME

positional arguments:
  PROVIDER           The cloud provider to act on (aws, gcp).
  CLUSTER_NAME       The Opstrace cluster name ([a-z0-9-_], no more than 13
                     characters).

optional arguments:
  -h, --help         show this help message and exit
  --log-level LEVEL  Set log level for output on stderr. One of: debug, info,
                     warning, error. Default: info
  --yes              Automatic yes to prompts; assume 'yes' as answer to all
                     prompts andrun non-interactively
  --region REGION    Set the AWS region to destroy in. Only needed when the
                     automatic region detection fails (when the corresponding
                     EKS cluster cannot be found or inspected). Not yet
                     supported for GCP.
```

Notes:

* Cloud provider, cloud credentials and Opstrace cluster name are the fundamental input parameters for the `destroy` operation.
* The `destroy` operation has internal timeout and retry logic.
  Unless you know better, it makes sense to keep this procedure running.
* When the `destroy` operation errors out expectedly or unexpectedly or when you interrupt it manually (for instance, by sending `SIGINT` via `Ctrl+C`) then you can safely re-run it.
  It largely is designed to pick up the work where it was left.
  However, in some cases after partial teardown it may ask you to provide the cloud region via the `--region` argument


### `list`

List existing Opstrace clusters (visible with the configured cloud credentials).

Example:

```text
./opstrace list aws
```

Help text:

```text
$ ./opstrace list --help
usage: opstrace list [-h] [--log-level LEVEL] PROVIDER

positional arguments:
  PROVIDER           The cloud provider to act on (aws, gcp).

optional arguments:
  -h, --help         show this help message and exit
  --log-level LEVEL  Set log level for output on stderr. One of: debug, info,
                     warning, error. Default: info
```

## Cloud credential discovery

<!--tabs-->
### AWS

If not specified otherwise, the Opstrace CLI tries to discover and use the AWS credentials from the `default` profile in the so-called shared AWS credentials file (`~/.aws/credentials` on Linux and Mac OS).

You can override this behavior by setting

* the environment variable `AWS_PROFILE` (for choosing a different profile from said AWS credentials file)
* the environment variables `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` (for not consulting the credentials file).

An more detailed specification can be found in the AWS SDK reference documentation [here](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-shared.html) and [here](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-environment.html).


### GCP

For managing Opstrace clusters on GCP, the Opstrace CLI requires the environment variable `GOOGLE_APPLICATION_CREDENTIALS` to be set.

The value is expected to be a file path to a GCP service account credential file in JSON format.

Example:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/home/dev/opstrace/secrets/gcp-credentials.json
```

A detailed specification can be found in [the GCP documentation](https://cloud.google.com/docs/authentication/getting-started#setting_the_environment_variable).

<!--/tabs-->
