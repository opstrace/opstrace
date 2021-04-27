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

import { EKS } from "aws-sdk";

import { ZonedDateTime, DateTimeFormatter } from "@js-joda/core";
import yesno from "yesno";

import { KubeConfig } from "@kubernetes/client-node";

import { generateKubeconfigStringForEksCluster } from "@opstrace/aws";
import { getGcpProjectId, getGKEKubeconfig } from "@opstrace/gcp";
import { log, hasUpperCase, die, sleep, ExitError } from "@opstrace/utils";

import {
  getValidatedGCPAuthOptionsFromFile,
  GCPAuthOptions
} from "@opstrace/gcp";
import { CLUSTER_NAME_REGEX, KNOWN_AWS_REGIONS } from "@opstrace/config";

import * as cli from "./index";
import * as list from "./list";

/**
 * Validate command line-provided cluster name, with a focus on good error
 * messages.
 */
export function validateClusterNameOrDie(cn: string): void {
  if (cn.length > 23) {
    die(
      `cluster name must not be longer than 23 characters (is: ${cn.length})`
    );
  }

  if (cn.length < 2) {
    die(`cluster name must be at least 2 characters long`);
  }

  if (hasUpperCase(cn)) {
    die(`cluster name must not contain uppercase characters`);
  }

  // enforce cluster name restrictions for providing decent error messages.
  if (!CLUSTER_NAME_REGEX.test(cn)) {
    die(`cluster name does not match regular expression ${CLUSTER_NAME_REGEX}`);
  }
}

/**Sanity-check the contents of GOOGLE_APPLICATION_CREDENTIALS: can the file be
 * read? does it appear to have the right contents? Don't over-do the content
 * validation: source of truth are the GCP libraries which after all re-read
 * the environment variable an do their own file content parsing.
 *
 * Do not handle GOOGLE_APPLICATION_CREDENTIALS to not be set; handled
 * elsewhere.
 */
export function gcpValidateCredFileAndGetDetailOrError(): GCPAuthOptions {
  const fpath = process.env["GOOGLE_APPLICATION_CREDENTIALS"] || "";
  let opts: GCPAuthOptions;
  try {
    opts = getValidatedGCPAuthOptionsFromFile(fpath);
  } catch (err) {
    die(
      `the environment variable GOOGLE_APPLICATION_CREDENTIALS does not appear to point to a valid file ('${fpath}'): ${err.message}`
    );
  }
  return opts;
}

export async function promptForProceed(question?: string): Promise<void> {
  //@ts-ignore: declared but value never read
  function handleInvalid(options) {
    process.stdout.write(
      `\nAnswer ${options.yesValues.join(", ")} or ${options.noValues.join(
        ", "
      )}\n`
    );
  }

  if (question === undefined) {
    question = "Proceed?";
  }

  if (cli.CLIARGS.assumeYes !== true) {
    // Note(JP): when sending SIGINT during the prompt it does not trigger
    // the handler we install. There must be some other handler taking
    // over. This is not so cool, because we want to control shutdown. In our
    // SIGINT handler. Code:
    // https://github.com/tcql/node-yesno/blob/master/yesno.js
    const proceed = await yesno({
      question: question + " [y/N]",
      invalid: handleInvalid
    });

    log.debug("prompt result: %s", proceed);

    if (proceed !== true) {
      throw new ExitError(1, "user abort");
    }
  } else {
    log.info("do not prompt: --yes is set");
  }
}

/**
 * Handle error seen by the saga middleware, i.e. when `rootTask()` throws an
 * error. This might very well be an unhandled error from further down in the
 * saga hierarchy. Consider this situation to be fatal. Log any relevant error
 * detail to optimize for debuggability. Also see
 * https://github.com/redux-saga/redux-saga/issues/1698
 * https://redux-saga.js.org/docs/basics/ErrorHandling.html
 */
//@ts-ignore: Argument 'detail' should be typed with a non-any type
// eslint-disable-next-line
export function smErrorLastResort(e: Error, detail: any): void {
  // Cleanly shut down runtime when the inner call stack has thrown
  // ExitError. To that end, simply let it bubble up.
  // Note(JP): when throwing an error in here it's seemingly not passing
  // through `mainWrapper()` which is why ExitError needs to be handled here
  // just as in in `mainWrapper()`.
  if (e instanceof ExitError) {
    if (e.message !== "") {
      log.error(e.message);
    }
    runtimeShutdown(e.exitcode);

    // It's critical to return here so that the remaining logic is not executed
    // while the runtime is actually shutting down.
    return;
  }

  // e.stack contains error name and message
  log.error("error seen by saga middleware:\n%s", e.stack);
  // `detail` is actually expected to be `{ sagaStack: string }` -- use `any`
  // in type signature for easier integration -- the way redux-saga calls it is
  // actually `unknown`.

  if (detail && detail.sagaStack !== undefined) {
    log.error("saga stack: %s", detail.sagaStack);
  }
  die("exit.");
}

export async function runtimeShutdown(exitcode: number): Promise<never> {
  log.debug("shut down logger, then exit with code %s", exitcode);

  // https://github.com/winstonjs/winston#awaiting-logs-to-be-written-in-winston
  // Register callback function once the logging system is shut down.
  log.on("finish", function () {
    process.exit(exitcode);
  });

  // Initiate the logging system shutdown. This is important for "flushing
  // buffers" (for writing all log messages to files, for examples).
  log.end();

  // Trade-off: this should be plenty of buffer, but still tolerable from a
  // user's point of view (before they get impatient). The idea is that this
  // never hits in unless the CLI is in a pathological state.
  await sleep(2.0);

  process.stderr.write(
    "winston logging system shutdown timed out, exit anyway (code 2)"
  );
  process.exit(2);
}

export function timestampForFilenames(ts: ZonedDateTime): string {
  /*
  Return a timestamp string suitable for filenames (log files, in particular)

  Ref: https://js-joda.github.io/js-joda/manual/formatting.html

  DateTimeFormatter is seemingly not documented, but
  https://github.com/js-joda/js-joda/issues/181 shows how to make complex
  patterns, in particular how to escape arbitrary text within the pattern
  string.

  */
  if (ts.zone().toString() !== "Z") throw Error("code assumes Zulu time");
  return ts.format(DateTimeFormatter.ofPattern("yyyyMMdd'-'HHmmss'Z'"));
}

/**
 * Try a dynamic lookup using the provided cluster name (auto-detect the
 * region). Fall back to other options when that fails:
 * - use what was provided via --region on cmdline
 * - error out if --region was not provided
 */
export async function awsGetClusterRegionWithCmdlineFallback(): Promise<string> {
  if (cli.CLIARGS.region !== "") {
    log.debug("region to destroy in from cli args: %s", cli.CLIARGS.region);

    if (!KNOWN_AWS_REGIONS.includes(cli.CLIARGS.region)) {
      const knownRegionString = KNOWN_AWS_REGIONS.join(", ");
      die(
        `The provided AWS region (${cli.CLIARGS.region}) is not ` +
          `known. Choose one of ${knownRegionString}.`
      );
    }

    return cli.CLIARGS.region;
  }

  const c = await awsGetClusterRegionDynamic(cli.CLIARGS.clusterName);

  if (c !== undefined) {
    return c.awsRegion;
  }

  // Note(JP): or instead of erroring out here fall back to some 'default'
  // region? Might feel nicer in some cases. But: I'd rather make this
  // explicit. For example, when the goal is to tear down the remainders of
  // a cluster in eu-central-1, then compare:
  //
  // 1) `... destroy foo`
  //
  //   Falls back to cleaning up in us-west-2 indicates success, but didn't
  //   even see the dirt (goal not achieved).
  //
  // 2) ... destroy foo` -> exit with below err msg -> re-invocation with
  //    `... destroy foo --region=eu-central-1` -> remainders are
  //    discovered and cleaned up after.
  die(
    `No EKS cluster found for cluster name '${cli.CLIARGS.clusterName}. ` +
      "Cannot determine cluster region. " +
      "Please specify the region with the --region command line argument."
  );
}

export async function awsGetClusterRegionDynamic(
  lookForOpstraceClusterName: string
): Promise<list.EKSOpstraceClusterRegionRelation | undefined> {
  log.info("starting lookup of EKS cluster accross AWS regions");
  const ocnRegionMap: Record<
    string,
    list.EKSOpstraceClusterRegionRelation
  > = {};
  for (const c of await list.EKSgetOpstraceClustersAcrossManyRegions()) {
    ocnRegionMap[c.opstraceClusterName] = c;
  }

  if (lookForOpstraceClusterName in ocnRegionMap) {
    const c = ocnRegionMap[lookForOpstraceClusterName];
    log.info(
      "identified AWS region (found EKS cluster %s): %s",
      lookForOpstraceClusterName,
      c.awsRegion
    );
    return c;
  }

  return undefined;
}

export async function getKubeConfigForOpstraceClusterOrDie(
  cloudProvider: "aws" | "gcp",
  opstraceClusterName: string
): Promise<KubeConfig> {
  let kubeconfig: KubeConfig;

  if (cloudProvider == "gcp") {
    gcpValidateCredFileAndGetDetailOrError();
    const pid: string = await getGcpProjectId();
    log.debug("GCP project ID: %s", pid);

    const kc = await getGKEKubeconfig(opstraceClusterName);
    if (kc === undefined) {
      die(
        `error while trying to generate the kubeconfig for cluster ${opstraceClusterName}`
      );
    }
    kubeconfig = kc;
  } else {
    // case: cloudProvider == "aws"
    const c = await awsGetClusterRegionDynamic(opstraceClusterName);

    if (c === undefined) {
      die(
        `Opstrace cluster not found across all inspected AWS regions: ${opstraceClusterName}`
      );
    }

    log.info(
      "cluster `%s` found in AWS region %s",
      c.opstraceClusterName,
      c.awsRegion
    );

    kubeconfig = genKubConfigObjForEKScluster(c.awsRegion, c.eksCluster);
  }

  return kubeconfig;
}

function genKubConfigObjForEKScluster(
  awsregion: string,
  eksCluster: EKS.Cluster
) {
  log.info("generate kubeconfig string for EKS cluster");
  const kstring = generateKubeconfigStringForEksCluster(awsregion, eksCluster);
  const kubeConfig = new KubeConfig();
  log.info("parse kubeconfig string for EKS cluster");
  kubeConfig.loadFromString(kstring);
  return kubeConfig;
}

export function gcpGetClusterRegion() {
  // TODO: either find a _smart_ way to look this up (for example: when the
  // corresponding GKE cluster exists then we can look up the region for that
  // cluster) or otherwise we might have to require this as user-given
  // input parameter for GCP teardown. That's not cool, I'd love for us to
  // only require credentials and Opstrace cluster name.
  return "us-west2";
}
