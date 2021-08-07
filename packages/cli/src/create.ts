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

import fs from "fs";

import { log, Dict, die, keyIDfromPEM, BUILD_INFO } from "@opstrace/utils";
import { setAWSRegion } from "@opstrace/aws";
import { GCPAuthOptions } from "@opstrace/gcp";

import {
  LatestClusterConfigType,
  LatestAWSInfraConfigType,
  LatestGCPInfraConfigType,
  setClusterConfig,
  REGION_EKS_AMI_MAPPING
} from "@opstrace/config";
import {
  createCluster,
  setGcpProjectID,
  setCreateConfig,
  ClusterCreateConfigInterface
} from "@opstrace/installer";

import * as cli from "./index";
import * as cryp from "./crypto";
import * as ucc from "./ucc";
import * as util from "./util";
import * as schemas from "./schemas";

import {
  OPSTRACE_DOCKERHUB_TOKEN,
  OPSTRACE_DOCKERHUB_USERNAME,
  logDockerHubCredentialsMessage
} from "@opstrace/controller-config";

type KeysetPemType = string;
type TenantApiTokensType = Dict<string>;

export async function create(): Promise<void> {
  const [userClusterConfig, infraConfigAWS, infraConfigGCP]: [
    schemas.LatestClusterConfigFileSchemaType,
    LatestAWSInfraConfigType | undefined,
    LatestGCPInfraConfigType | undefined
  ] = await ucc.uccGetAndValidate(
    cli.CLIARGS.clusterConfigFilePath,
    cli.CLIARGS.cloudProvider
  );
  // If the cluster is sufficiently large, the user can hit dockerhub rate limits
  // for image pulling https://www.docker.com/increase-rate-limits
  // To be safe, we'll exit out of cluster creation early if they don't have
  // env vars set containing dockerhub credentials.
  // Assert dockerhub username and token are set as environment variables.
  // These env vars (if they exist) will be used during the deployControllerResources phase of install/upgrade
  const username = process.env[OPSTRACE_DOCKERHUB_USERNAME];
  const token = process.env[OPSTRACE_DOCKERHUB_TOKEN];

  if (userClusterConfig.node_count > 5) {
    if (!(username && token)) {
      die(
        "OPSTRACE_DOCKERHUB_USERNAME, OPSTRACE_DOCKERHUB_TOKEN environment variables must be set to avoid image pull rate-limits from dockerhub (https://www.docker.com/increase-rate-limits)." +
          "OPSTRACE_DOCKERHUB_USERNAME must be your dockerhub username, and OPSTRACE_DOCKERHUB_TOKEN must be a valid dockerhub access token." +
          "You can create an access token here: https://hub.docker.com/settings/security"
      );
    }
  }

  // TODO: continuation mode: detect when there is _state_ for this in
  // well-known file system path(s) (authentication tokens in particular) and
  // then do not generate new key material, but try to discover authentication
  // tokens for all tenants specified in the config file. Also inspect 'cluster
  // name' in auth tokens, compare to what was provided on cmdline. Error out
  // if there seems to be an inconsistency. If there is no inconsistency:
  // use tokens from disk.
  // For storing state, also see https://github.com/opstrace/opstrace/issues/237
  // and for the larger topic of detecting continuation also see
  // https://github.com/opstrace/opstrace/issues/20

  // `tenantApiTokens`: sensitive data, watch out.
  const [tenant_api_authenticator_pubkey_set_json, tenantApiTokens] =
    genCryptoMaterialForAPIAuth(userClusterConfig);

  //let gcpProjectID: string | undefined;
  if (cli.CLIARGS.cloudProvider == "gcp") {
    const gcpopts: GCPAuthOptions =
      util.gcpValidateCredFileAndGetDetailOrError();
    log.info("GCP project ID: %s", gcpopts.projectId);
    log.info(
      "GCP service account email notation: %s",
      gcpopts.credentials.client_email
    );
    setGcpProjectID(gcpopts.projectId);
  }

  // renderedClusterConfig: internal, complete
  const renderedClusterConfig: LatestClusterConfigType = {
    ...userClusterConfig,
    ...{
      aws: infraConfigAWS,
      gcp: infraConfigGCP,
      cloud_provider: cli.CLIARGS.cloudProvider,
      cluster_name: cli.CLIARGS.instanceName,
      tenant_api_authenticator_pubkey_set_json:
        tenant_api_authenticator_pubkey_set_json
    }
  };

  log.info(
    "rendered cluster config:\n%s",
    JSON.stringify(renderedClusterConfig, null, 2)
  );

  // Sanity check. It's a bug (not user error) when this fails. Make
  // corresponding checks beforehand.
  schemas.LatestRenderedClusterConfigSchema.validateSync(
    renderedClusterConfig,
    {
      strict: true
    }
  );

  // make config for current context globally known in installer
  // dirty cfg-as-singleton-immutable approach
  setClusterConfig(renderedClusterConfig);

  const createConfig: ClusterCreateConfigInterface = {
    holdController: cli.CLIARGS.holdController,
    tenantApiTokens: tenantApiTokens,
    kubeconfigFilePath: cli.CLIARGS.kubeconfigFilePath
  };
  setCreateConfig(createConfig);

  // Note(JP): `setAWSRegion()` must be called precisely once per `... create
  // ...` invocation. Doing that here is a pragmatic way to achieve that.
  if (infraConfigAWS !== undefined) {
    // Set region for AWS client library abstractions.
    if (!(infraConfigAWS.region in REGION_EKS_AMI_MAPPING)) {
      die(
        `The AWS region you have configured is not (yet) supported: ${infraConfigAWS.region}`
      );
    }
    setAWSRegion(infraConfigAWS.region);
  }
  // Log the DockerHub credentials just before prompt so user can verify (if they're present)
  logDockerHubCredentialsMessage("create");

  await promptForResourceCreation(renderedClusterConfig);

  writeTenantApiTokenFiles(tenantApiTokens);

  await createCluster(util.smErrorLastResort);
}

async function promptForResourceCreation(ccfg: LatestClusterConfigType) {
  if (ccfg.cloud_provider === "aws") {
    const url = `https://go.opstrace.com/cli-aws-mutating-api-calls/${BUILD_INFO.VERSION_STRING}`;
    log.info(
      "Before we continue, please review the set of state-mutating " +
        "AWS API calls emitted by this CLI during cluster creation: %s",
      url
    );
    await util.promptForProceed();
  }

  // if (ccfg.cloud_provider === "gcp") {
  // }
}

function writeTenantApiTokenFiles(tenantApiTokens: Dict<string>) {
  for (const [tname, token] of Object.entries(tenantApiTokens)) {
    const fpath = `tenant-api-token-${tname}`;

    // for now bluntly overwrite (todo: offer options, via cli args)
    log.info("write api token for tenant %s to file %s", tname, fpath);
    fs.writeFileSync(fpath, token, { encoding: "utf8" });

    // todo: set file permissions (600), treat sensitive
  }
}

function genCryptoMaterialForAPIAuth(
  ucc: schemas.LatestClusterConfigFileSchemaType
): [KeysetPemType, TenantApiTokensType] {
  const tenantApiTokens: Dict<string> = {};

  // Empty string: when authenticator is deactivated.
  let tenant_api_authenticator_pubkey_set_json = "";

  if (!ucc.data_api_authentication_disabled) {
    const tnames = [...ucc.tenants];

    // create an authentication token for the system tenant, too.
    tnames.push("system");
    for (const tenantName of tnames) {
      const t = cryp.generateJWTforTenantAPI(
        tenantName,
        cli.CLIARGS.instanceName
      );
      tenantApiTokens[tenantName] = t;
    }

    const data_api_authn_pubkey_pem = cryp.getPubkeyAsPem();
    const keyId = keyIDfromPEM(data_api_authn_pubkey_pem);
    log.info(
      "serialized public key (id: %s) for tenant API token verification",
      keyId
    );

    // The key set is required to be a mapping between keyID (string) and
    // PEM-encoded pubkey (string).
    // Note: upon _continutation_, this key should be added to the existing
    // key set.
    const keyset = {
      [keyId]: data_api_authn_pubkey_pem
    };

    // The corresponding configuration parameter value is expected to be a
    // string, namely the above `keyset` mapping in JSON-encoded form *without
    // literal newline chars*.
    tenant_api_authenticator_pubkey_set_json = JSON.stringify(keyset);

    log.debug(
      "public key (id: %s) in PEM-encoded X.509 SubjectPublicKeyInfo/OpenSSL format:\n%s",
      keyId,
      data_api_authn_pubkey_pem
    );
  } else {
    log.info(
      "Do not generate cryptographic material (tenant API authentication is disabled)"
    );
  }

  // when api auth disabled: empty values: ["", {}]
  return [tenant_api_authenticator_pubkey_set_json, tenantApiTokens];
}
