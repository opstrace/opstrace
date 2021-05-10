---
description: Upgrade Opstrace to latest available release.
---

# Upgrading

**NOTE:**

While upgrades may work, we do not yet fully support in-place upgrades.
There are many issues associated with doing this well, and we plan to continue developing it in the future.
If you'd like to contribute we'd love to have your help.

We do not yet support upgrades on GCP.

This guide will show you how to upgrade Opstrace to the latest available version on AWS.

## Step 0: Setup

Open a terminal and verify you have the following, because GCP is not yet supported, we will focus on AWS:

* To upgrade Opstrace you'll need the [AWS Command Line Interface v2 (AWS CLI)](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)
  * We recommend `AdministratorAccess` for this quick start; for additional info check out our [cloud permissions reference](./references/aws.md).
  * The original `opstrace-config.yaml` used to create Opstrace.

Note: the code blocks are all copy-and-pastable.

Download the latest Opstrace CLI binary from S3, which you will use to upgrade Opstrace (~50M compressed):

<!--tabs-->

### MacOS

```bash
# Download the CLI from S3 and extract it
curl -L https://go.opstrace.com/cli-latest-macos | tar xjf -

# Test the extracted binary
./opstrace --help
```

### Linux

```bash
# Download the CLI from S3 and extract it
curl -L https://go.opstrace.com/cli-latest-linux | tar xjf -

# Test the extracted binary
./opstrace --help
```

If you see a proper help message, you're ready to go.
So let's get started.

## Step 1: Upgrade Opstrace

Define `OPSTRACE_NAME` with your Opstrace installation (it must be 13 characters or less):

<!--export-to-input-->

```bash
export OPSTRACE_NAME=<name_choosen_at_install_time>
```

The name globally identifies you in our domain as `$OPSTRACE_NAME.opstrace.io`, which we provide for you by default as a convenience.

**Your input needed:** After you initiate the command below, a browser page is going to pop up asking you to sign in with a Google account.
(The URL will also be printed in the CLI output.)
This is so we can and provide a seamless user experience for our provided DNS.

Let's get things going:

```bash
./opstrace upgrade aws $OPSTRACE_NAME \
  -c opstrace-config.yaml
```

**Be patient:** Upgrade takes on average 10 minutes on AWS (but it can go as long as 30 minutes if upgrading Cortex and Loki).

**So you know:** The CLI is largely re-entrant. If it is interrupted while setting up cloud infrastructure you can re-invoke the same command and it will continue where it left off.
For additional information understanding and troubleshooting the `upgrade` command, see our [CLI reference section](./references/cli.md#upgrade).

When everything is done, you'll see the following log line:

`info: Opstrace cluster upgrade done for $OPSTRACE_NAME (aws)`

In case of any **upgrade errors** check the [known issues section](./guides/administrator/troubleshooting.md#known-issues) or search our [GitHub issues](https://github.com/opstrace/opstrace/issues).
