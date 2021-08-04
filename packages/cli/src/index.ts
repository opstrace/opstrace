#!/usr/bin/env node
/**
 * Copyright 2020 Opstrace, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// about stack traces showing TS line numbers also see
// opstrace-prelaunch/issues/1186
// note: can one add `--enable-source-maps` as default arg via shebang?
// import sourceMapSupport from "source-map-support";
// sourceMapSupport.install({
//   handleUncaughtExceptions: false,
//   environment: "node",
//   hookRequire: true
// });
import "source-map-support/register";

import argparse from "argparse";
import AWS from "aws-sdk";
import { ZonedDateTime, ZoneOffset } from "@js-joda/core";

import {
  setLogger,
  buildLogger,
  log,
  die,
  ExitError,
  ExitSuccess,
  BUILD_INFO
} from "@opstrace/utils";

import * as aks from "./aks";
import * as create from "./create";
import * as destroy from "./destroy";
import * as list from "./list";
import * as status from "./status";
import * as info from "./info";
import * as upgrade from "./upgrade";
import * as util from "./util";
import * as ctoken from "./createTenantAuthToken";

// typescript barrel export: https://basarat.gitbook.io/typescript/main-1/barrel
export { gcpValidateCredFileAndGetDetailOrError } from "./util";

const DEFAULT_LOG_LEVEL_STDERR = "info";

const START_TIME_JODA = ZonedDateTime.now(ZoneOffset.UTC);

interface CliOptsInterface {
  command: string;
  cloudProvider: "gcp" | "aws";
  instanceName: string;
  clusterConfigFilePath: string;
  logLevel: "debug" | "info" | "warning" | "error";
  holdController: boolean;
  showVersion: boolean;
  region: string;
  assumeYes: boolean;
  kubeconfigFilePath: string; // empty means: not set
  tenantApiAuthenticatorKeyFilePath: string; // empty means: not set
  keyId: string; // empty means: not set
  tenantName: string; // empty means: not set
}

// Note(JP): think of this as a singleton object (set once, immutable, allow
// reading from everywhere).
export let CLIARGS: CliOptsInterface;

async function main() {
  parseCmdlineArgs();
  logBuildInfo();
  readCloudCredsOrExit();

  if (CLIARGS.instanceName !== undefined) {
    util.validateClusterNameOrDie(CLIARGS.instanceName);
  }
  switch (CLIARGS.command) {
    case "destroy":
      await destroy.destroy();
      break;
    case "create":
      await create.create();
      break;
    case "list":
      await list.list();
      break;
    case "status":
      await status.status();
      break;
    case "info":
      await info.info();
      break;
    case "upgrade":
      await upgrade.upgrade();
      break;
    case "ta-create-token":
      await ctoken.create();
      break;
    case "ta-create-keypair":
      await aks.createKeypair();
      break;
    case "ta-pubkeys-add":
      await aks.addKeyToAuthenticatorConfig();
      break;
    case "ta-pubkeys-list":
      await aks.listKeys();
      break;
    case "ta-pubkeys-remove":
      await aks.removeKey();
      break;
    default:
      throw Error("should never be here");
  }

  throw new ExitSuccess();
}

/**
 * Parse user-given command line arguments.
 *
 * Terminate the process if desired, with the expected output (e.g. in case of
 * --help or --version) or with a decent error message about.
 *
 * Desired side effects:
 *
 *    - Populate `CLIARGS` object.
 *    - Configure logger with desired log level.
 *
 */
function parseCmdlineArgs() {
  // Undocumented entry point for testing how a stacktrace-emitting crash looks
  // like, see issue opstrace-prelaunch/issues/991. This can be on second or
  // third position depending on the method of invocation:
  //   ./node packages/cli/build/index.js crashtest
  //   ./opstrace-cli crashtest
  if (process.argv.length <= 3 && process.argv.includes("crashtest")) {
    throw new Error("this is how things look like in view of sadness");
  }

  const mainParser = new argparse.ArgumentParser({
    description: "Opstrace CLI",
    prog: "opstrace"
  });

  mainParser.add_argument("--version", {
    help: "Show version information and exit.",
    action: "store_true",
    default: false,
    dest: "showVersion"
  });

  const subparsers = mainParser.add_subparsers({
    title: "Available commands",
    dest: "command"
  });

  const parserCreate = subparsers.add_parser("create", {
    help: "Create a new Opstrace instance."
  });
  const parserDestroy = subparsers.add_parser("destroy", {
    help: "Tear down an existing Opstrace instance."
  });
  const parserList = subparsers.add_parser("list", {
    help:
      "List existing Opstrace instances (visible with the configured cloud credentials)."
  });
  const parserStatus = subparsers.add_parser("status", {
    help:
      "Check the status of an Opstrace instance (experimental, no promises)."
  });
  const parserInfo = subparsers.add_parser("info", {
    help:
      "Get infrastructure and Opstrace instance version information (experimental, no promises)."
  });
  const parserUpgrade = subparsers.add_parser("upgrade", {
    help: "Upgrade an existing Opstrace instance."
  });

  const parserTACreateKeypair = subparsers.add_parser("ta-create-keypair", {
    help: "Tenant authentication: create a new RSA key pair."
  });

  const parserTACreateToken = subparsers.add_parser("ta-create-token", {
    help:
      "Tenant authentication: create a tenant API authentication token " +
      "signed with a custom private key. Write token to stdout.",
    description: "Write token to stdout"
  });

  const parserTAPubKeysAdd = subparsers.add_parser("ta-pubkeys-add", {
    help:
      "Tenant authentication: add public key to a running Opstrace instance " +
      "so that it accepts tokens signed with the corresponding private key."
  });

  // Note: the `help` pops up when listing sub commands, the `description`
  // pops up when showing --help for this specific sub command. The high-level
  // help should be part of the more fine-grained description.
  const parserTAPubKeysListHelp =
    "Tenant authentication: list public keys for a running Opstrace instance, " +
    "i.e. the set of trust anchors for signed authentication tokens.";
  const parserTAPubKeysList = subparsers.add_parser("ta-pubkeys-list", {
    help: parserTAPubKeysListHelp,
    description:
      `${parserTAPubKeysListHelp} The configured public keys are ` +
      `listed via their key ID on stdout, with one key ID per line.`
  });

  const parserTAPubKeysRemoveHelp =
    "Tenant authentication: remove a specific public key from the set of trust anchors, " +
    "i.e. do not accept corresponding authentication tokens anymore.";
  const parserTAPubKeysRemove = subparsers.add_parser("ta-pubkeys-remove", {
    help: parserTAPubKeysRemoveHelp,
    description:
      `${parserTAPubKeysRemoveHelp} The relevant public key needs to be ` +
      `specified via its key ID. You can list currently configured keys with ` +
      `the 'ta-pubkeys-list' command.`
  });

  // The --log-level switch must work when not using a sub command, but also
  // for each sub command.
  for (const p of [
    parserCreate,
    parserTACreateKeypair,
    parserTACreateToken,
    parserTAPubKeysAdd,
    parserTAPubKeysList,
    parserTAPubKeysRemove,
    parserDestroy,
    parserList,
    parserStatus,
    parserInfo,
    parserUpgrade,
    mainParser
  ]) {
    p.add_argument("--log-level", {
      help: `Set log level for output on stderr. One of: debug, info, warning, error. Default: ${DEFAULT_LOG_LEVEL_STDERR}`,
      type: "str",
      choices: ["debug", "info", "warning", "error"],
      default: DEFAULT_LOG_LEVEL_STDERR,
      metavar: "LEVEL",
      dest: "logLevel"
    });
  }

  for (const p of [
    parserCreate,
    parserDestroy,
    parserList,
    parserStatus,
    parserInfo,
    parserUpgrade
  ]) {
    p.add_argument("cloudProvider", {
      help: "The cloud provider to act on (aws, gcp).", // potentially make this a little more specific depending on `create`, `list`, ...
      type: "str",
      choices: ["aws", "gcp"],
      metavar: "PROVIDER"
    });
  }

  for (const p of [
    parserCreate,
    parserDestroy,
    parserStatus,
    parserInfo,
    parserUpgrade
  ]) {
    p.add_argument("instanceName", {
      help:
        "The Opstrace instance name ([a-z0-9-_], no more than 23 characters).",
      type: "str",
      metavar: "INSTANCE_NAME"
    });
  }

  for (const p of [parserCreate, parserStatus, parserUpgrade]) {
    p.add_argument("-c", "--instance-config", {
      help:
        "File path to the config document (YAML). Read from stdin otherwise.",
      metavar: "CONFIG_FILE_PATH",
      dest: "clusterConfigFilePath",
      type: "str",
      default: ""
    });
  }

  // Add --yes to relevant parsers.
  for (const p of [parserCreate, parserDestroy, parserUpgrade]) {
    // only long option to keep cmd expressive. apt-get has `-y, --yes,
    // --assume-yes`, documented with " Automatic yes to prompts; assume "yes" as
    // answer to all prompts and run non-interactively."
    p.add_argument("--yes", {
      help:
        "Automatic yes to prompts; assume 'yes' as answer to all prompts and " +
        "run non-interactively.",
      action: "store_true",
      default: false,
      dest: "assumeYes"
    });
  }

  parserCreate.add_argument("--hold-controller", {
    help:
      "Do not deploy controller into k8s cluster (for development purposes).",
    action: "store_true",
    default: false,
    dest: "holdController"
  });

  parserCreate.add_argument("--write-kubeconfig-file", {
    help:
      "Write kubectl config file (for KUBECONFIG env var) as soon as data is " +
      "available (right after K8s cluster has been set up).",
    type: "str",
    metavar: "PATH",
    dest: "kubeconfigFilePath",
    default: ""
  });

  configureParserTACreateToken(parserTACreateToken);
  configureParserTAPubKeysAdd(parserTAPubKeysAdd);
  configureParserTAPubKeysList(parserTAPubKeysList);
  configureParserTAPubKeysRemove(parserTAPubKeysRemove);
  configureParserTACreateKeypair(parserTACreateKeypair);

  // About those next two args: that's just brainstorm, maybe do not build
  // that... Maybe _always_ drop that private key. maybe only provide one
  // qualified method that involves: generating a new keypair, configuring the
  // authenticator with the pub key, and then creating new authentication
  // tokens with the priv key

  // parserCreate.add_argument("--tenant-api-authenticator-privkey-file", {
  //   help:
  //     "Instead of generating a fresh RSA key pair, use this private key to " +
  //     "sign tenant API authentication tokens. " +
  //     "Extract public key and configure authenticator with it. File path " +
  //     "must point to a PEM RSA private key file using the " +
  //     "PKCS#8 (RFC 3447) serialization format. (experimental, noop)",
  //   type: "str",
  //   metavar: "PATH",
  //   dest: "tenantApiAuthenticatorPrivkeyFilepath",
  //   default: ""
  // });

  // parserCreate.add_argument("--write-tenant-api-authenticator-privkey", {
  //   help:
  //     "Write the RSA private key used for signing tenant API authentication " +
  //     "tokens to this file. If not specified, the private key is dropped and " +
  //     "lost. The private key is written to a PEM file using using the " +
  //     "PKCS#8 (RFC 3447) serialization format. (experimental, noop)",
  //   type: "str",
  //   metavar: "PATH",
  //   dest: "tenantApiAuthenticatorPrivkeyFilepath",
  //   default: ""
  // });

  for (const p of [parserDestroy, parserUpgrade]) {
    p.add_argument("--region", {
      help:
        "Set the AWS region. Only needed when the automatic " +
        "region detection fails (when the corresponding EKS cluster " +
        "cannot be found or inspected). Not yet supported for GCP.",
      type: "str",
      metavar: "REGION",
      dest: "region",
      default: ""
    });
  }

  CLIARGS = mainParser.parse_args();

  const logFileName = `opstrace_cli_${
    CLIARGS.command
  }_${util.timestampForFilenames(START_TIME_JODA)}.log`;

  // For now, create a log file in cwd, and hard-code log level to debug.
  // Expose CLI options for controlling that soon thereafter.
  // console.log("setLogger");
  setLogger(
    buildLogger({
      stderrLevel: CLIARGS.logLevel,
      filePath: logFileName,
      fileLevel: "debug"
    })
  );

  if (CLIARGS.showVersion) {
    showVersionAndExit();
  }

  // Manually handle the case where no sub command has been provided (not
  // handled via argparse because we allow invocation w/o sub command for e.g.
  // --version ).
  if (CLIARGS.command === undefined) {
    mainParser.print_help();
    throw new ExitError(
      1,
      "Missing argument. See message above for instructions."
    );
  }

  log.info("logging to file: %s", logFileName);
  log.debug("cli args:\n%s", JSON.stringify(CLIARGS, null, 2));
}

// Mutate parser in place.
function configureParserTACreateToken(parser: argparse.ArgumentParser) {
  parser.add_argument("instanceName", {
    help:
      "The name of the Opstrace instance to generate the token for. " +
      "Be sure to set it correctly, otherwise the token will not be accepted.",
    type: "str",
    metavar: "INSTANCE_NAME"
  });

  parser.add_argument("tenantName", {
    help:
      "The name of the tenant to generate the token for. " +
      "Be sure to set it correctly, otherwise the token will not be accepted.",
    type: "str",
    metavar: "TENANT_NAME"
  });

  parser.add_argument("tenantApiAuthenticatorKeyFilePath", {
    help:
      "Use the private key encoded in this file to sign the token. " +
      "The path must point to a PEM RSA private key file using the PKCS#1 or " +
      "PKCS#8 serialization format.",
    type: "str",
    metavar: "KEYPAIR_FILE_PATH",
    default: ""
  });
}

// Mutate parser in place.
function configureParserTAPubKeysAdd(parser: argparse.ArgumentParser) {
  parser.add_argument("cloudProvider", {
    help: "The cloud provider to look up the Opstrace instance in (aws, gcp).",
    type: "str",
    choices: ["aws", "gcp"],
    metavar: "PROVIDER"
  });

  parser.add_argument("instanceName", {
    help:
      "The name of the Opstrace instance to change the authenticator configuration for.",
    type: "str",
    metavar: "INSTANCE_NAME"
  });

  parser.add_argument("tenantApiAuthenticatorKeyFilePath", {
    help:
      "Use the RSA public key encoded in this file. The path must point to " +
      "a PEM-encoded private or public key file (a private key file encodes " +
      "the complete key pair, and a public key file encodes just the " +
      "public key.",
    type: "str",
    metavar: "KEY_FILE_PATH",
    default: ""
  });
}

// Mutate parser in place.
function configureParserTAPubKeysList(parser: argparse.ArgumentParser) {
  parser.add_argument("cloudProvider", {
    help: "The cloud provider to look up the Opstrace instance in (aws, gcp).",
    type: "str",
    choices: ["aws", "gcp"],
    metavar: "PROVIDER"
  });

  parser.add_argument("instanceName", {
    help:
      "The name of the Opstrace instance to look up the authenticator configuration for.",
    type: "str",
    metavar: "INSTANCE_NAME"
  });
}

// Mutate parser in place.
function configureParserTAPubKeysRemove(parser: argparse.ArgumentParser) {
  parser.add_argument("cloudProvider", {
    help: "The cloud provider to look up the Opstrace instance in (aws, gcp).",
    type: "str",
    choices: ["aws", "gcp"],
    metavar: "PROVIDER"
  });

  parser.add_argument("instanceName", {
    help:
      "The name of the instance to change the authenticator configuration in.",
    type: "str",
    metavar: "INSTANCE_NAME"
  });

  parser.add_argument("keyId", {
    help: "Use ID of the public key to remove.",
    type: "str",
    metavar: "KEY_ID",
    default: ""
  });
}

// Mutate parser in place.
function configureParserTACreateKeypair(parser: argparse.ArgumentParser) {
  parser.add_argument("tenantApiAuthenticatorKeyFilePath", {
    help:
      "Write the RSA private key (also containing the public key) in the " +
      "PKCS#8 format to this file.",
    type: "str",
    metavar: "KEYPAIR_FILE_PATH",
    default: ""
  });
}

/**
 * Read/discover cloud credentials from environment / file system. Error out
 * with a decent error message when a requirement is not met.
 */
function readCloudCredsOrExit(): void {
  if (CLIARGS.cloudProvider == "gcp") {
    if (!("GOOGLE_APPLICATION_CREDENTIALS" in process.env)) {
      die("environment variable GOOGLE_APPLICATION_CREDENTIALS is not set");
    }
  }

  if (CLIARGS.cloudProvider == "aws") {
    // Rely on aws-sdk-js to auto-discover credentials also from shared
    // credentials file (not just from env vars AWS_ACCESS_KEY_ID /
    // AWS_SECRET_ACCESS_KEY. Reference docs are:
    // https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-shared.html
    // Should link to that from our doc. Should link to our doc in error
    // message.
    const creds = AWS.config.credentials;
    if (creds === undefined || creds === null) {
      die(
        "Could not automatically discover AWS credentials. " +
          "Consider setting the environment variables " +
          "AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY or ... [link to docs]"
      );
    }

    // Relevant discussion
    // opstrace-prelaunch/issues/1793
    const accesskeyPfxSfx = `${creds?.accessKeyId.slice(
      0,
      4
    )}...${creds?.accessKeyId.slice(-4)}`;
    log.info("Discovered AWS credentials. Access key: %s", accesskeyPfxSfx);
  }
}

/**
 * Write version information to stdout and exit with status 0, indicating
 * success.
 *
 * Debug-log (to stderr? I hope) more build info.
 */
function showVersionAndExit(): never {
  process.stdout.write(`${BUILD_INFO.VERSION_STRING}\n`);
  log.debug("BUILD_INFO_COMMIT: %s", BUILD_INFO.COMMIT);
  log.debug("BUILD_INFO_TIME_RFC3339: %s", BUILD_INFO.BUILD_TIME_RFC3339);
  log.debug("BUILD_INFO_HOSTNAME: %s", BUILD_INFO.BUILD_HOSTNAME);
  log.debug("BUILD_INFO_BRANCH_NAME: %s", BUILD_INFO.BRANCH_NAME);

  // Cleanly shut down logging system.
  throw new ExitSuccess();
}

function logBuildInfo(): void {
  log.debug(`CLI build information: ${JSON.stringify(BUILD_INFO, null, 2)}`);
}

async function mainWrapper() {
  try {
    await main();
  } catch (e) {
    if (e instanceof ExitSuccess) {
      util.runtimeShutdown(0);
    }
    if (e instanceof ExitError) {
      if (e.message !== "") {
        log.error(e.message);
      }
      util.runtimeShutdown(e.exitcode);
    }
    throw e;
  }
}

if (require.main === module) {
  process.on("SIGINT", function () {
    log.debug("Received SIGINT, exiting");
    // not awaited on purpose, still triggers the right logic.
    util.runtimeShutdown(1);
  });

  // NodeJS 12 does not crash by default upon unhandled promise rejections.
  // Make it crash.
  process.on("unhandledRejection", err => {
    throw err;
  });

  // being able to say `await main()` instead of `main()` here requires
  // `module` be `system` or `esnext` in tsconfig which seems to lead to
  // to complications elsewhere. Just calling `main() like below, however,
  // clearly leaves a floating promise behind.
  // That will fail `@typescript-eslint/no-floating-promises"` if we were to
  // use it.
  mainWrapper();
}
