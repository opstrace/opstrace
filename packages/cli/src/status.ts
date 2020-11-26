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
import { call, race, delay } from "redux-saga/effects";
import createSagaMiddleware from "redux-saga";
import { createStore, applyMiddleware } from "redux";

import { smErrorLastResort } from "./util";
import * as ucc from "./ucc";
import * as cli from "./index";
import { Dict, SECOND } from "@opstrace/utils";
import {
  setClusterConfig,
  NewRenderedClusterConfigType,
  InfraConfigTypeAWS,
  InfraConfigTypeGCP
} from "@opstrace/config";
import {
  ClusterCreateConfigInterface,
  setCreateConfig,
  waitUntilLokiCortexAreReachable
} from "@opstrace/installer";
import * as schemas from "./schemas";

function readTenantApiTokenFiles(tenants: string[]): Dict<string> {
  const tenantApiTokens: Dict<string> = {};
  // also read system tenant api token
  tenants.push("system");
  for (const tname of tenants) {
    const fpath = `tenant-api-token-${tname}`;
    const token = fs.readFileSync(fpath);
    tenantApiTokens[tname] = token.toString();
  }
  return tenantApiTokens;
}

/**
 * Simple function that checks if Loki and Cortex are up and running
 * in all tenants.
 */
async function checkClusterStatus() {
  // Note(JP): this following codeblock is here copied from the `create` module
  // -- with the sole purpose to get the list of tenants from the cluster
  // config file. I think we should not require the cluster config file as an
  // input parameter for this, but maybe a list of tenants instead, if desired:
  //
  //   opstrace status aws jpdev --tenant system --tenant default..
  //
  // Definitely technical debt leaking as an interface, needs to be
  // consolidated.
  const [userClusterConfig, infraConfigAWS, infraConfigGCP]: [
    schemas.ClusterConfigFileSchemaType,
    InfraConfigTypeAWS | undefined,
    InfraConfigTypeGCP | undefined
  ] = await ucc.uccGetAndValidate(
    cli.CLIARGS.clusterConfigFilePath,
    cli.CLIARGS.cloudProvider
  );

  const ccfg: NewRenderedClusterConfigType = {
    ...userClusterConfig,
    ...{
      aws: infraConfigAWS,
      gcp: infraConfigGCP,
      cloud_provider: cli.CLIARGS.cloudProvider,
      cluster_name: cli.CLIARGS.clusterName,
      data_api_authn_pubkey_pem: ""
    }
  };
  setClusterConfig(ccfg);

  const tenantApiTokens = readTenantApiTokenFiles(ccfg.tenants);
  const createConfig: ClusterCreateConfigInterface = {
    holdController: cli.CLIARGS.holdController,
    tenantApiTokens: tenantApiTokens
  };
  setCreateConfig(createConfig);

  await waitUntilLokiCortexAreReachable(
    ccfg.cluster_name,
    ccfg.tenants,
    ccfg.cloud_provider
  );
}

// Race to check cluster status and fail if it takes longer than 60 seconds.
function* rootTaskStatusCore() {
  const { timeout } = yield race({
    status: call(checkClusterStatus),
    timeout: delay(60 * SECOND)
  });

  if (timeout) {
    throw new Error("timeout checking the status of the cluster");
  }
}

// Wrapper to make redux-saga happy.
function* rootTaskStatus() {
  yield call(rootTaskStatusCore);
}

// Empty reducer to make redux-saga happy.
const reducer = (state = 0, action: any) => {
  return state;
};

export async function status() {
  const sm = createSagaMiddleware({ onError: smErrorLastResort });
  createStore(reducer, applyMiddleware(sm));
  await sm.run(rootTaskStatus).toPromise();
}
