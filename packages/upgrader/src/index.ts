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
import { fork, call, race, delay, cancel } from "redux-saga/effects";
import { createStore, applyMiddleware } from "redux";
import createSagaMiddleware from "redux-saga";

import { KubeConfig } from "@kubernetes/client-node";

import { k8sListNamespacesOrError } from "@opstrace/kubernetes";
import { getGKEKubeconfig } from "@opstrace/gcp";

import { setAWSRegion, getEKSKubeconfig } from "@opstrace/aws";

import { log, SECOND, retryUponAnyError } from "@opstrace/utils";

import { rootReducer /*, State */ } from "./reducer";
import { ClusterUpgradeTimeoutError } from "./errors";
import { runInformers, blockUntilCacheHydrated } from "./informers";
import {
  upgradeProgressReporter,
  waitForControllerDeployment
} from "./readiness";
import { upgradeControllerDeployment } from "./upgrade";

// Note: a largish number of attempts as long as micro retries are not yet
// implemented carefully and thoughtfully.
const UPGRADE_ATTEMPTS = 5;

// timeout per cluster upgrade attempt
const UPGRADE_ATTEMPT_TIMEOUT_SECONDS = 60 * 20;

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

function* upgradeClusterCore() {
  if (upgradeConfig === undefined) {
    throw new Error("call setUpgradeConfig() first");
  }

  const kubeconfig: KubeConfig | undefined = yield call(
    getKubecfgIfk8sClusterExists,
    upgradeConfig
  );

  if (kubeconfig === undefined) {
    throw new Error("could not fetch cluster kubeconfig");
  }

  yield call(triggerUpgrade, kubeconfig);

  log.info(
    "Opstrace cluster upgrade done for %s (%s)",
    upgradeConfig.clusterName,
    upgradeConfig.cloudProvider
  );
}

/**
 * Trigger soft-upgrade by bumping the controller deployment version.
 */
function* triggerUpgrade(kubeConfig: KubeConfig) {
  // Explicitly test the availability of the k8s api and exit if interaction
  // fails.
  yield call(k8sListNamespacesOrError, kubeConfig);

  log.info("k8s cluster seems to exist, trigger upgrade");

  log.info("starting kubernetes informers");
  const informers = yield fork(runInformers, kubeConfig);

  yield call(blockUntilCacheHydrated);

  yield call(upgradeControllerDeployment, {
    opstraceClusterName: upgradeConfig.clusterName,
    kubeConfig: kubeConfig
  });

  yield call(waitForControllerDeployment);

  log.info('wait for upgrade to complete ("wait for deployments/..." phase)');
  yield call(upgradeProgressReporter);

  // Cancel the forked informers so we can exit
  yield cancel(informers);
}

/**
 * Timeout control around a single cluster upgrade attempt.
 */
function* upgradeClusterAttemptWithTimeout() {
  log.debug("upgradeClusterAttemptWithTimeout");
  const { timeout } = yield race({
    upgrade: call(upgradeClusterCore),
    timeout: delay(UPGRADE_ATTEMPT_TIMEOUT_SECONDS * SECOND)
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
      UPGRADE_ATTEMPT_TIMEOUT_SECONDS
    );
    throw new ClusterUpgradeTimeoutError();
  }
}

function* rootTaskUpgrade() {
  // Note: a longish delay between attempts with the intention to give upgrade
  // attempts some time to take effect holistically (sometimes, that is our
  // impression, deletion of an individual resource might be confirmed
  // synchronously, but after all still takes a while to be properly reflected
  // across all views).
  yield call(retryUponAnyError, {
    task: upgradeClusterAttemptWithTimeout,
    maxAttempts: UPGRADE_ATTEMPTS,
    doNotLogDetailForTheseErrors: [ClusterUpgradeTimeoutError],
    actionName: "cluster upgrade",
    delaySeconds: 30
  });
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
