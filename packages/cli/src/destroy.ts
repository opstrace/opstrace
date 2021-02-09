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

import { log } from "@opstrace/utils";

import { setDestroyConfig, destroyCluster } from "@opstrace/uninstaller";

import * as cli from "./index";
import * as util from "./util";

export async function destroy(): Promise<void> {
  let gcpProjectID: string | undefined;
  let gcpRegion: string | undefined;
  if (cli.CLIARGS.cloudProvider == "gcp") {
    const gcpopts = util.gcpValidateCredFileAndGetDetailOrError();
    gcpProjectID = gcpopts.projectId;
    gcpRegion = util.gcpGetClusterRegion();
  }

  let awsRegion: string | undefined;
  if (cli.CLIARGS.cloudProvider == "aws") {
    awsRegion = await util.awsGetClusterRegion();
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
