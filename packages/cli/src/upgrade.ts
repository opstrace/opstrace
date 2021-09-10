/**
 * Copyright 2021 Opstrace, Inc.
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
import { upgradeCluster, setUpgradeConfig } from "@opstrace/upgrader";
import {
  LatestAWSInfraConfigType,
  LatestClusterConfigType,
  LatestGCPInfraConfigType,
  setClusterConfig
} from "@opstrace/config";

import * as cli from "./index";
import * as util from "./util";
import * as schemas from "./schemas";
import * as ucc from "./ucc";
import { setGcpProjectID } from "@opstrace/installer";
import { logDockerHubCredentialsMessage } from "@opstrace/controller-config";

export async function upgrade(): Promise<void> {
  log.info(
    `About to upgrade Opstrace instance '${cli.CLIARGS.instanceName}' (${cli.CLIARGS.cloudProvider}).`
  );

  const [userClusterConfig, infraConfigAWS, infraConfigGCP]: [
    schemas.LatestClusterConfigFileSchemaType,
    LatestAWSInfraConfigType | undefined,
    LatestGCPInfraConfigType | undefined
  ] = await ucc.uccGetAndValidate(
    cli.CLIARGS.clusterConfigFilePath,
    cli.CLIARGS.cloudProvider
  );

  // renderedClusterConfig: internal, complete
  const renderedClusterConfig: LatestClusterConfigType = {
    ...userClusterConfig,
    ...{
      aws: infraConfigAWS,
      gcp: infraConfigGCP,
      cloud_provider: cli.CLIARGS.cloudProvider,
      cluster_name: cli.CLIARGS.instanceName,
      // Important note. This field is intentionally set to the empty string
      // during the upgrade since we do not want to override it. The value is
      // instead read from the controller configuration stored in the config map.
      tenant_api_authenticator_pubkey_set_json: ""
    }
  };

  // make config for current context globally known in upgrader dirty
  // cfg-as-singleton-immutable approach
  setClusterConfig(renderedClusterConfig);

  let gcpProjectID: string | undefined;
  let gcpRegion: string | undefined;
  if (cli.CLIARGS.cloudProvider == "gcp") {
    const gcpopts = util.gcpValidateCredFileAndGetDetailOrError();
    gcpProjectID = gcpopts.projectId;
    gcpRegion = util.gcpGetClusterRegion();

    log.info("GCP project ID: %s", gcpopts.projectId);
    log.info(
      "GCP service account email notation: %s",
      gcpopts.credentials.client_email
    );
    setGcpProjectID(gcpopts.projectId);
  }

  let awsRegion: string | undefined;
  if (cli.CLIARGS.cloudProvider == "aws") {
    // TODO: The function has destroy-specific user feedback (log output);
    // which does not read nicely when it fails in the context of `upgrade`.
    awsRegion = await util.awsGetClusterRegionWithCmdlineFallback();
  }

  setUpgradeConfig({
    cloudProvider: cli.CLIARGS.cloudProvider,
    clusterName: cli.CLIARGS.instanceName,
    gcpProjectID: gcpProjectID,
    gcpRegion: gcpRegion,
    awsRegion: awsRegion
  });
  // Log the DockerHub credentials just before prompt so user can verify (if they're present)
  logDockerHubCredentialsMessage("upgrade");

  await util.promptForProceed();
  await upgradeCluster(util.smErrorLastResort);
}
