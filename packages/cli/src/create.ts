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

import { log, Dict, die } from "@opstrace/utils";
import { setAWSRegion } from "@opstrace/aws";
import {
  NewRenderedClusterConfigType,
  InfraConfigTypeAWS,
  InfraConfigTypeGCP,
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
import { BUILD_INFO } from "./buildinfo";

type PubkeyPemType = string;
type TenantApiTokensType = Dict<string>;

export async function create(): Promise<void> {
  const [userClusterConfig, infraConfigAWS, infraConfigGCP]: [
    schemas.ClusterConfigFileSchemaType,
    InfraConfigTypeAWS | undefined,
    InfraConfigTypeGCP | undefined
  ] = await ucc.uccGetAndValidate(
    cli.CLIARGS.clusterConfigFilePath,
    cli.CLIARGS.cloudProvider
  );

  // `tenantApiTokens`: sensitive data, watch out.
  const [
    data_api_authn_pubkey_pem,
    tenantApiTokens
  ] = genCryptoMaterialForAPIAuth(userClusterConfig);

  let gcpProjectID: string | undefined;
  if (cli.CLIARGS.cloudProvider == "gcp") {
    gcpProjectID = util.gcpValidateCredFileAndGetProjectIDOrError();
    setGcpProjectID(gcpProjectID);
  }

  // renderedClusterConfig: internal, complete
  const renderedClusterConfig: NewRenderedClusterConfigType = {
    ...userClusterConfig,
    ...{
      aws: infraConfigAWS,
      gcp: infraConfigGCP,
      cloud_provider: cli.CLIARGS.cloudProvider,
      cluster_name: cli.CLIARGS.clusterName,
      data_api_authn_pubkey_pem: data_api_authn_pubkey_pem
    }
  };

  log.info(
    "rendered cluster config:\n%s",
    JSON.stringify(renderedClusterConfig, null, 2)
  );

  // Sanity check. It's a bug (not user error) when this fails. Make
  // corresponding checks beforehand.
  schemas.renderedClusterConfigSchema.validateSync(renderedClusterConfig, {
    strict: true
  });

  // make config for current context globally known in installer
  // dirty cfg-as-singleton-immutable approach
  setClusterConfig(renderedClusterConfig);

  const createConfig: ClusterCreateConfigInterface = {
    holdController: cli.CLIARGS.holdController,
    tenantApiTokens: tenantApiTokens
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

  await promptForResourceCreation(renderedClusterConfig);

  writeTenantApiTokenFiles(tenantApiTokens);

  await createCluster(util.smErrorLastResort);
}

async function promptForResourceCreation(ccfg: NewRenderedClusterConfigType) {
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
  ucc: schemas.ClusterConfigFileSchemaType
): [PubkeyPemType, TenantApiTokensType] {
  const tenantApiTokens: Dict<string> = {};
  let data_api_authn_pubkey_pem = "";

  if (!ucc.data_api_authentication_disabled) {
    const tnames = [...ucc.tenants];

    // create an authentication token for the system tenant, too.
    tnames.push("system");
    for (const tenantName of tnames) {
      const t = cryp.generateJWTforTenantAPI(
        tenantName,
        cli.CLIARGS.clusterName
      );
      tenantApiTokens[tenantName] = t;
    }

    data_api_authn_pubkey_pem = cryp.getPubkeyAsPem();

    log.info("generated public key for data API auth token (JWT) verification");

    log.debug(
      "public key in PEM-encoded X.509 SubjectPublicKeyInfo/OpenSSL format:\n%s",
      data_api_authn_pubkey_pem
    );
  } else {
    log.info(
      "Do not generate cryptographic material (tenant API authentication is disabled)"
    );
  }

  // when api auth disabled: empty values: ["", {}]
  return [data_api_authn_pubkey_pem, tenantApiTokens];
}
