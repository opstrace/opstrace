/**
 * Copyright 2019-2021 Opstrace, Inc.
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

import { log, die } from "@opstrace/utils";
import { KNOWN_AWS_REGIONS } from "@opstrace/config";
import { setDestroyConfig, destroyCluster } from "@opstrace/uninstaller";

import * as cli from "./index";
import * as util from "./util";
import * as list from "./list";

export async function destroy(): Promise<void> {
  let gcpProjectID: string | undefined;
  let gcpRegion: string | undefined;
  if (cli.CLIARGS.cloudProvider == "gcp") {
    const gcpopts = util.gcpValidateCredFileAndGetDetailOrError();
    gcpProjectID = gcpopts.projectId;
    gcpRegion = gcpGetRegionToDestroyIn();
  }

  let awsRegion: string | undefined;
  if (cli.CLIARGS.cloudProvider == "aws") {
    awsRegion = await awsGetRegionToDestroyIn();
  }

  // The "destroy config" concept is deliberately chaotic for now. user-given
  // should only be cloud creds (implicitly), cloud provider and cluster name
  // (both explicitly). In addition to that, the destroy config may contain
  // derived properties.

  setDestroyConfig({
    cloudProvider: cli.CLIARGS.cloudProvider,
    clusterName: cli.CLIARGS.clusterName,
    gcpProjectID: gcpProjectID,
    gcpRegion: gcpRegion,
    awsRegion: awsRegion
  });

  log.info(
    `About to destroy cluster ${cli.CLIARGS.clusterName} (${cli.CLIARGS.cloudProvider}).`
  );
  await util.promptForProceed();
  await destroyCluster(util.smErrorLastResort);
}

/**
 * Try a dynamic lookup using the provided cluster name (auto-detect the
 * region). Fall back to other options when that fails:
 * - use what was provided via --region on cmdline
 * - error out if --region was not provided
 */
async function awsGetRegionToDestroyIn(): Promise<string> {
  if (cli.CLIARGS.regionToDestroyIn !== "") {
    log.debug(
      "region to destroy in from cli args: %s",
      cli.CLIARGS.regionToDestroyIn
    );

    if (!KNOWN_AWS_REGIONS.includes(cli.CLIARGS.regionToDestroyIn)) {
      const knownRegionString = KNOWN_AWS_REGIONS.join(", ");
      die(
        `The provided AWS region (${cli.CLIARGS.regionToDestroyIn}) is not ` +
          `known. Choose one of ${knownRegionString}.`
      );
    }

    return cli.CLIARGS.regionToDestroyIn;
  }

  log.info(
    "try to identify AWS region to initiate destroy operation in: look up EKS clusters"
  );
  const ocnRegionMap: Record<string, string> = {};
  for (const c of await list.listOpstraceClustersOnEKS()) {
    ocnRegionMap[c.opstraceClusterName] = c.awsRegion;
  }

  if (cli.CLIARGS.clusterName in ocnRegionMap) {
    const r = ocnRegionMap[cli.CLIARGS.clusterName];
    log.info(
      "identified AWS region to destroy in (found EKS cluster %s): %s",
      cli.CLIARGS.clusterName,
      r
    );
    return r;
  }

  // Empty string: convention for not set via cmdline.
  //
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
      "Cannot determine region to destroy in. " +
      "Please specify the region with the --region command line argument."
  );
}

function gcpGetRegionToDestroyIn() {
  // TODO: either find a _smart_ way to look this up (for example: when the
  // corresponding GKE cluster exists then we can look up the region for that
  // cluster) or otherwise we might have to require this as user-given
  // input parameter for GCP teardown. That's not cool, I'd love for us to
  // only require credentials and Opstrace cluster name.
  return "us-west2";
}
