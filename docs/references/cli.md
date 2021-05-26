# Opstrace Command Line Interface (CLI) Reference

This document provides reference information about the Opstrace command line interface (CLI).

## Commands

Please use the `--help` switch to discover additional reference information that the CLI emits about itself.

### `create`

Creates a new Opstrace instance with a [configuration document](cluster-configuration.md).

Example (for creating an instance named `test` in AWS):

```text
./opstrace create aws test -c config.yaml
```

Help text:

```text
$ ./opstrace create --help
usage: opstrace create [-h] [--log-level LEVEL] [-c CONFIG_FILE_PATH] [--yes]
                       [--hold-controller] [--write-kubeconfig-file PATH]
                       PROVIDER CLUSTER_NAME

positional arguments:
  PROVIDER              The cloud provider to act on (aws, gcp).
  CLUSTER_NAME          The Opstrace cluster name ([a-z0-9-_], no more than
                        23 characters).

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
  --write-kubeconfig-file PATH
                        Write kubectl config file (for KUBECONFIG env var)
                        as soon as data is available (right after K8s cluster
                        has been set up).
```

Notes:

* Cloud provider and instance name are not part of the configuration document.
That means that the same configuration document can be re-used across cloud providers and also across instances with different names.
* The `create` operation has internal timeout and retry logic.
  Unless you know better, it makes sense to keep this operation running.
* When the `create` operation detects a problem that needs to be resolved through human intervention then it does not necessarily error out immediately.
  Instead, it presents the problem through its logs, retries periodically, and waits for you to take action behind the scenes.
  For example, when a cloud resource can't be created as of a quota error then you can infer that from the CLI's log output and can take action while the CLI keeps retrying.
  If you do not take action, the `create` operation will time out eventually.
* For some permanent, non-retryable errors the `create` operation will exit immediately, providing a clear error message.
* When the `create` operation errors out expectedly or unexpectedly or when you interrupt it manually (for instance, by sending `SIGINT` via `Ctrl+C`) then you can safely re-run it.
  It is designed to pick up the work where it was left.

### `destroy`

Remove an existing Opstrace instance and all its supporting cloud resources.

Example (for tearing down an instance named `test` in AWS):

```text
./opstrace destroy aws test
```

In the happy path no input beyond cloud provider and instance name is needed.
However, in certain ambiguous cases where the CLI can not automatically detect the region your instance is in, it will ask for the `--region` argument.
Once provided, the CLI will remove all resources created for that instance name in the given region.

Help text:

```text
$ ./opstrace destroy --help
usage: opstrace destroy [-h] [--log-level LEVEL] [--yes] [--region REGION]
                        PROVIDER CLUSTER_NAME

positional arguments:
  PROVIDER           The cloud provider to act on (aws, gcp).
  CLUSTER_NAME       The Opstrace cluster name ([a-z0-9-_], no more than 23
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

* Cloud provider, cloud credentials and Opstrace instance name are the fundamental input parameters for the `destroy` operation.
* The `destroy` operation has internal timeout and retry logic, similar to the `create` operation.
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

### `upgrade`

Upgrade Opstrace from the version running in your account to the version defined by the current CLI you are using.

Example (to upgrade an instance named `test` in AWS):

```text
./opstrace upgrade aws test -c config.yaml
```

Help text:

```text
$ ./opstrace upgrade --help
usage: opstrace upgrade [-h] [--log-level LEVEL] [-c CONFIG_FILE_PATH]
                        [--yes] [--region REGION] PROVIDER CLUSTER_NAME

positional arguments:
  PROVIDER              The cloud provider to act on (aws, gcp).
  CLUSTER_NAME          The Opstrace cluster name ([a-z0-9-_], no more
                        than 23 characters).

optional arguments:
  -h, --help         show this help message and exit
  --log-level LEVEL  Set log level for output on stderr. One of: debug, info,
                     warning, error. Default: info
  -c CONFIG_FILE_PATH, --cluster-config CONFIG_FILE_PATH
                        File path to cluster config document (YAML). Read
                        from stdin otherwise.
  --yes              Automatic yes to prompts; assume 'yes' as answer to all
                     prompts andrun non-interactively
  --region REGION    Set the AWS region. Only needed when the
                     automatic region detection fails (when the corresponding
                     EKS cluster cannot be found or inspected). Not yet
                     supported for GCP.
```

Notes:

* The CLI version that executes the upgrade command defines the Opstrace target version.
* The original config file used to create the instance is required. However, changes to it are not yet supported. This requirement might change in the future.
* The `upgrade` operation has internal timeout and retry logic, similar to the `create` operation.
  Unless you know better, it makes sense to keep this procedure running.
* When the `upgrade` operation detects a problem that needs to be resolved through human intervention then it does not necessarily error out immediately.
  Instead, it presents the problem through its logs, retries periodically, and waits for you to take action behind the scenes.
  For example, when a cloud resource can't be upgraded as of a quota error then you can infer that from the CLI's log output and can take action while the CLI keeps retrying.
  If you do not take action, the `upgrade` operation will time out eventually.
* For some permanent, non-retryable errors the `upgrade` operation will exit immediately, providing a clear error message.
* When the `upgrade` operation errors out expectedly or unexpectedly or when you interrupt it manually (for instance, by sending `SIGINT` via `Ctrl+C`) then you can safely re-run it.
  It is designed to pick up the work where it was left.

### Tenant API Authentication with `ta-*` Commands

The `ta-` prefix represents the idea of "tenant API authentication."
See our upcoming Tenant Guide for usage examples.

```bash
$ ./opstrace --help
usage: opstrace [-h] [--version] [--log-level LEVEL]

    {create,destroy,list,status,upgrade,ta-create-keypair,ta-create-token,ta-pubkeys-add,ta-pubkeys-list,ta-pubkeys-remove}

    ...

    ta-create-keypair   Tenant authentication: create a new RSA key pair.
    ta-create-token     Tenant authentication: create a tenant API authentication token signed with a custom private key.
                        Write token to stdout.
    ta-pubkeys-add      Tenant authentication: add public key to a running Opstrace cluster so that it accepts tokens
                        signed with the corresponding private key.
    ta-pubkeys-list     Tenant authentication: list public keys for a running Opstrace cluster, i.e. the set of trust
                        anchors for signed authentication tokens.
    ta-pubkeys-remove   Tenant authentication: remove a specific public key from the set of trust anchors, i.e. do not
                        accept corresponding authentication tokens anymore.
```

All `ta-*` commands offered by the Opstrace CLI are new and should be thought of as experimental (command names and signatures are subject to potentially big changes in the future).

## Cloud credential discovery

<!--tabs-->
### AWS

If not specified otherwise, the Opstrace CLI tries to discover and use the AWS credentials from the `default` profile in the so-called shared AWS credentials file (`~/.aws/credentials` on Linux and Mac OS).

You can override this behavior by setting

* the environment variable `AWS_PROFILE` (for choosing a different profile from said AWS credentials file)
* the environment variables `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` (for not consulting the credentials file).

An more detailed specification can be found in the AWS SDK reference documentation [here](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-shared.html) and [here](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-environment.html).


### GCP

For managing Opstrace on GCP, the Opstrace CLI requires the environment variable `GOOGLE_APPLICATION_CREDENTIALS` to be set.

The value is expected to be a file path to a GCP service account credential file in JSON format.

Example:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/home/dev/opstrace/secrets/gcp-credentials.json
```

A detailed specification can be found in [the GCP documentation](https://cloud.google.com/docs/authentication/getting-started#setting_the_environment_variable).

<!--/tabs-->
