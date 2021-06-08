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

import fs from "fs";
import { fork, call, race, delay, cancel } from "redux-saga/effects";
import { createStore, applyMiddleware } from "redux";
import createSagaMiddleware from "redux-saga";

import { KubeConfig } from "@kubernetes/client-node";

import { k8sListNamespacesOrError } from "@opstrace/kubernetes";
import { getGKEKubeconfig } from "@opstrace/gcp";

import { setAWSRegion, getEKSKubeconfig } from "@opstrace/aws";

import {
  log,
  SECOND,
  retryUponAnyError,
  checkIfDockerImageExistsOrErrorOut,
  die,
  Dict
} from "@opstrace/utils";

import { rootReducer } from "./reducer";
import { ClusterUpgradeTimeoutError } from "./errors";
import { runInformers, blockUntilCacheHydrated } from "./informers";
import {
  upgradeProgressReporter,
  waitForControllerDeployment
} from "./readiness";
import {
  cortexOperatorPreamble,
  upgradeControllerConfigMap,
  upgradeControllerDeployment,
  upgradeInfra
} from "./upgrade";
import { getClusterConfig, LatestClusterConfigType } from "@opstrace/config";
import {
  ClusterCreateConfigInterface,
  setCreateConfig,
  waitUntilHTTPEndpointsAreReachable
} from "@opstrace/installer";
import { workaroundRestartLokiDistributors } from "./workaround";

// Note: a largish number of attempts as long as micro retries are not yet
// implemented carefully and thoughtfully.
const UPGRADE_ATTEMPTS = 5;

// timeout per cluster upgrade attempt
const UPGRADE_INFRA_ATTEMPT_TIMEOUT_SECONDS = 60 * 20; // 20 min

// A controller deployment upgrade can take longer, for example, if it needs to
// rollout an update to the cortex ingesters.
const UPGRADE_K8S_RESOURCES_ATTEMPT_TIMEOUT_SECONDS = 45 * 60; // 45 min

interface UpgradeConfigInterface {
  cloudProvider: "gcp" | "aws";
  clusterName: string;
  gcpProjectID: string | undefined;
  gcpRegion: string | undefined;
  awsRegion: string | undefined;
}

// think of this as singleton (set once, immutable, read from everywhere)
let upgradeConfig: UpgradeConfigInterface;

export function setUpgradeConfig(c: UpgradeConfigInterface): void {
  upgradeConfig = c;

  // Configure AWS client lib state with region information. Needs to be done
  // before using any AWS client lib (S3, EKS, ...). Could be done by the code
  // that also calls `setUpgradeConfig()` but on the other hand, this can
  // also be done in here, which is a little cleaner.
  if (c.awsRegion !== undefined) {
    log.debug(
      "setUpgradeConfig(): set AWS region for client libs: %s",
      c.awsRegion
    );
    setAWSRegion(c.awsRegion);
  }
}

async function getKubecfgIfk8sClusterExists(
  upgradeConfig: UpgradeConfigInterface
): Promise<KubeConfig | undefined> {
  switch (upgradeConfig.cloudProvider) {
    case "gcp":
      return getGKEKubeconfig(upgradeConfig.clusterName);
    case "aws":
      return getEKSKubeconfig(
        upgradeConfig.awsRegion!,
        upgradeConfig.clusterName
      );
    default:
      throw Error("must never be here");
  }
}

// Uprade infrastructure. Infrastructure are all the components required to
// create a Kubernetes cluster and any other components, ex. cloud storage
// buckets, required to run Opstrace. Checks if Kubernetes cluster is available
// before starting the upgrade.
function* triggerInfraUpgrade() {
  if (upgradeConfig === undefined) {
    throw new Error("call setUpgradeConfig() first");
  }

  const kubeConfig: KubeConfig | undefined = yield call(
    getKubecfgIfk8sClusterExists,
    upgradeConfig
  );

  if (kubeConfig === undefined) {
    throw new Error("could not fetch cluster kubeconfig");
  }

  const ucc: LatestClusterConfigType = getClusterConfig();

  try {
    // Check the tenant API tokens are available and fail as early as possible
    // if they are not.
    const tenantApiTokens = readTenantApiTokenFiles(ucc.tenants);
    const createConfig: ClusterCreateConfigInterface = {
      holdController: true,
      tenantApiTokens: tenantApiTokens,
      kubeconfigFilePath: ""
    };
    // This is required by the waitUntil*AreReachable functions called by
    // triggerControllerDeploymentUpgrade to check the endpoints are available
    // when the upgrade finishes.
    setCreateConfig(createConfig);
  } catch (e) {
    die(`could not find tenant api token files: ${e}`);
  }

  yield call(checkIfDockerImageExistsOrErrorOut, ucc.controller_image);

  // Explicitly test the availability of the k8s api and exit if interaction
  // fails.
  yield call(k8sListNamespacesOrError, kubeConfig);

  log.info("k8s cluster seems to exist, trigger infrastructure upgrade");

  if (!dryRun()) {
    yield call(upgradeInfra, upgradeConfig.cloudProvider);
  }
}

// Upgrade controller deployment and wait for it to finish updating Kubernetes
// resources.
function* triggerControllerDeploymentUpgrade() {
  if (upgradeConfig === undefined) {
    throw new Error("call setUpgradeConfig() first");
  }

  const kubeConfig: KubeConfig | undefined = yield call(
    getKubecfgIfk8sClusterExists,
    upgradeConfig
  );

  if (kubeConfig === undefined) {
    throw new Error("could not fetch cluster kubeconfig");
  }

  const ucc: LatestClusterConfigType = getClusterConfig();

  yield call(checkIfDockerImageExistsOrErrorOut, ucc.controller_image);

  // Explicitly test the availability of the k8s api and exit if interaction
  // fails.
  yield call(k8sListNamespacesOrError, kubeConfig);

  log.info("k8s cluster seems to exist, trigger controller deployment upgrade");

  log.info("starting kubernetes informers");
  //@ts-ignore: TS7075 generator lacks return type (TS 4.3)
  const informers = yield fork(runInformers, kubeConfig);

  yield call(blockUntilCacheHydrated);

  if (!dryRun()) {
    yield call(upgradeControllerConfigMap, kubeConfig);

    // handle upgrades from clusters that are not running the cortex-operator
    yield call(cortexOperatorPreamble, kubeConfig);

    yield call(upgradeControllerConfigMap, kubeConfig);

    const rolloutStarted: boolean = yield call(upgradeControllerDeployment, {
      opstraceClusterName: upgradeConfig.clusterName,
      kubeConfig: kubeConfig
    });

    if (rolloutStarted) {
      yield call(waitForControllerDeployment, { desiredReadyReplicas: 1 });
      log.info(
        'wait for upgrade to complete ("wait for deployments/..." phase)'
      );
      yield call(upgradeProgressReporter);

      // Workaround for https://github.com/opstrace/opstrace/issues/1066
      yield call(workaroundRestartLokiDistributors);
    }
  }

  // Cancel the forked informers so we can exit
  yield cancel(informers);

  // ensure the data endpoint, datadog api endpoints and ui are reachable
  yield call(waitUntilHTTPEndpointsAreReachable, ucc);
}

function readTenantApiTokenFiles(tenantNames: string[]): Dict<string> {
  const tenantApiTokens: Dict<string> = {};
  // also read system tenant api token
  const tnames = [...tenantNames];
  tnames.push("system");

  for (const tname of tnames) {
    const fpath = `tenant-api-token-${tname}`;
    const token = fs.readFileSync(fpath);
    tenantApiTokens[tname] = token.toString();
  }
  return tenantApiTokens;
}

/**
 * Timeout control around a single cluster infrastructure upgrade attempt.
 */
function* upgradeClusterCoreAttemptWithTimeout() {
  log.debug("upgradeClusterInfraAttemptWithTimeout");
  const { timeout } = yield race({
    upgrade: call(triggerInfraUpgrade),
    timeout: delay(UPGRADE_INFRA_ATTEMPT_TIMEOUT_SECONDS * SECOND)
  });

  if (timeout) {
    // Note that in this case redux-saga guarantees to have cancelled the
    // task(s) that lost the race, i.e. the `upgrade` task above.
    // see https://redux-saga.js.org/docs/advanced/TaskCancellation.html
    // however, this does not seem to reliable cancel all tasks spawned along
    // the hierarchy, maybe as of usage of promises as part of the stack?
    // also see opstrace-prelaunch/issues/1457
    log.warning(
      "cluster upgrade attempt timed out after %s seconds",
      UPGRADE_INFRA_ATTEMPT_TIMEOUT_SECONDS
    );
    throw new ClusterUpgradeTimeoutError();
  }
}

/**
 * Timeout control around a single cluster Kubernetes resources upgrade attempt.
 */
function* upgradeControllerDeploymentWithTimeout() {
  log.debug("upgradeControllerDeploymentWithTimeout");
  const { timeout } = yield race({
    upgrade: call(triggerControllerDeploymentUpgrade),
    timeout: delay(UPGRADE_K8S_RESOURCES_ATTEMPT_TIMEOUT_SECONDS * SECOND)
  });

  if (timeout) {
    // Note that in this case redux-saga guarantees to have cancelled the
    // task(s) that lost the race, i.e. the `upgrade` task above.
    // see https://redux-saga.js.org/docs/advanced/TaskCancellation.html
    // however, this does not seem to reliable cancel all tasks spawned along
    // the hierarchy, maybe as of usage of promises as part of the stack?
    // also see opstrace-prelaunch/issues/1457
    log.warning(
      "cluster upgrade attempt timed out after %s seconds",
      UPGRADE_K8S_RESOURCES_ATTEMPT_TIMEOUT_SECONDS
    );
    throw new ClusterUpgradeTimeoutError();
  }
}

function* rootTaskUpgrade() {
  // Note: a longish delay between attempts with the intention to give upgrade
  // attempts some time to take effect holistically (sometimes, that is our
  // impression, upgrade of an individual resource might be confirmed
  // synchronously, but after all still takes a while to be properly reflected
  // across all views).
  yield call(retryUponAnyError, {
    task: upgradeClusterCoreAttemptWithTimeout,
    maxAttempts: UPGRADE_ATTEMPTS,
    doNotLogDetailForTheseErrors: [ClusterUpgradeTimeoutError],
    actionName: "cluster infrastructure upgrade",
    delaySeconds: 30
  });

  // Wait for controller to rollout the upgrade.
  yield call(upgradeControllerDeploymentWithTimeout);

  log.info(
    "upgrade operation finished for %s (%s)",
    upgradeConfig.clusterName,
    upgradeConfig.cloudProvider
  );
  log.info(`Log in here: https://${upgradeConfig.clusterName}.opstrace.io`);
}

/**
 * Entry point for cluster upgrade to be called by CLI.
 */
export async function upgradeCluster(
  smOnError: (e: Error, detail: unknown) => void
): Promise<void> {
  const sm = createSagaMiddleware({ onError: smOnError });
  createStore(rootReducer, applyMiddleware(sm));

  await sm.run(rootTaskUpgrade).toPromise();

  // this is helpful when the runtime is supposed to crash but doesn't
  log.debug("end of upgradeCluster()");
}

function dryRun(): boolean {
  return process.env.DRY_RUN_UPGRADES === "true";
}
