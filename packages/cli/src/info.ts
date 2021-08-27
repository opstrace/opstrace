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

import { call, race, delay } from "redux-saga/effects";
import createSagaMiddleware from "redux-saga";
import { createStore, applyMiddleware } from "redux";

import {
  smErrorLastResort,
  getKubeConfigForOpstraceClusterOrDie
} from "./util";
import * as cli from "./index";
import { log, die, SECOND, parseVersionFromImageTag } from "@opstrace/utils";
import {
  STORAGE_KEY,
  CONFIGMAP_NAME,
  CONTROLLER_NAME,
  CONTROLLER_NAMESPACE,
  LatestControllerConfigSchema
} from "@opstrace/controller-config";
import {
  AppsV1Api,
  CoreV1Api,
  VersionApi,
  VersionInfo,
  V1ConfigMap,
  V1Deployment
} from "@kubernetes/client-node";

/**
 * getClusterInfo reads Kubernetes and Opstrace cluster state
 * from the apiserver then prints this information in human-readable format.
 */
async function getClusterInfo() {
  // All information printed by this command hinges on k8s cluster availability.
  // getKubeConfigForOpstraceClusterOrDie will log an indicative message and
  // throw an exception if the kubeconfig it generates cannot contact a cluster
  // at the expected host, which is desirable here.
  const kcfg = await getKubeConfigForOpstraceClusterOrDie(
    cli.CLIARGS.cloudProvider,
    cli.CLIARGS.instanceName
  );

  // Read controller ConfigMap and die if not found.
  let cm: V1ConfigMap;
  try {
    const coreClient = kcfg.makeApiClient(CoreV1Api);
    cm = (await coreClient.readNamespacedConfigMap(CONFIGMAP_NAME, "default"))
      .body;
  } catch (err: any) {
    die(
      `failed to read Opstrace controller config map: ${
        err.response ? err.response.body.message : err
      }`
    );
  }
  const cfgJSON = JSON.parse(cm.data?.[STORAGE_KEY] ?? "");
  if (cfgJSON === "") {
    die(`invalid Opstrace controller config map`);
  }

  log.debug(`controller config: ${JSON.stringify(cfgJSON, null, 2)}`);

  // Set lastCLIVersion to the config's latest value if available. CLI metadata
  // will be present in the latest config version(s) only, but its non-existence should
  // not result in a command error.
  let lastCLIVersion = "undefined";
  if (LatestControllerConfigSchema.isValidSync(cfgJSON, { strict: true })) {
    const cfg = LatestControllerConfigSchema.validateSync(cfgJSON);
    lastCLIVersion =
      cfg.cliMetadata.allCLIVersions[cfg.cliMetadata.allCLIVersions.length - 1]
        ?.version;
  }

  // Determine the current controller version.
  let cd: V1Deployment;
  try {
    const appsClient = kcfg.makeApiClient(AppsV1Api);
    cd = (
      await appsClient.readNamespacedDeployment(
        CONTROLLER_NAME,
        CONTROLLER_NAMESPACE
      )
    ).body;
  } catch (err: any) {
    die(
      `failed to read Opstrace controller deployment: ${
        err.response ? err.response.body.message : err
      }`
    );
  }
  // Image will always be defined since it is retrieved from the controller deployment's podspec.
  const controllerVersion = parseVersionFromImageTag(
    cd.spec!.template.spec!.containers[0].image!
  );

  // Read Kubernetes cluster info for the full server version.
  let k8sSrvInfo: VersionInfo;
  try {
    k8sSrvInfo = (await kcfg.makeApiClient(VersionApi).getCode()).body;
  } catch (err: any) {
    die(`failed to read Kubernetes server info: ${err}`);
  }

  // Finally, write cluster info.
  console.log(`
cluster info:
  kubernetes_version: ${k8sSrvInfo.gitVersion}
  controller_version: ${controllerVersion}
  installer_version: ${lastCLIVersion}
  `);
}

// Race to get cluster info and fail if it takes longer than 60 seconds.
function* rootTaskInfoCore() {
  const { timeout } = yield race({
    info: call(getClusterInfo),
    timeout: delay(60 * SECOND)
  });

  if (timeout) {
    throw new Error("timeout getting Opstrace cluster info");
  }
}

// Wrapper to make redux-saga happy.
function* rootTaskInfo() {
  yield call(rootTaskInfoCore);
}

// Empty reducer to make redux-saga happy.
const reducer = (state = 0) => state;

export async function info(): Promise<void> {
  const sm = createSagaMiddleware({ onError: smErrorLastResort });
  createStore(reducer, applyMiddleware(sm));
  await sm.run(rootTaskInfo).toPromise();
}
