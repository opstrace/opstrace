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
import { strict as assert } from "assert";

import { select, fork, call, race, delay, cancel } from "redux-saga/effects";
import { createStore, applyMiddleware } from "redux";
import createSagaMiddleware from "redux-saga";

import { KubeConfig } from "@kubernetes/client-node";

import { getKubeConfig, k8sListNamespacesOrError } from "@opstrace/kubernetes";

import {
  generateKubeconfigStringForGkeCluster,
  getGcpProjectId,
  doesGKEClusterExist
} from "@opstrace/gcp";

import {
  generateKubeconfigStringForEksCluster,
  doesEKSClusterExist,
  setAWSRegion
} from "@opstrace/aws";

import { log, SECOND, retryUponAnyError } from "@opstrace/utils";
import { CONTROLLER_NAME } from "@opstrace/controller";

import {
  set as saveControllerConfig,
  fetch as getControllerConfig
} from "@opstrace/controller-config";

import { rootReducer, State } from "./reducer";
import { destroyGCPInfra } from "./gcp";
import { destroyAWSInfra } from "./aws";
import { ClusterDestroyTimeoutError } from "./errors";
import { runInformers, blockUntilCacheHydrated } from "./informers";
import { uninstallProgressReporter } from "./readiness";

// Note(JP): a largish number of attempts as long as micro retries are not
// yet implemented carefully and thoughtfully.
const DESTROY_ATTEMPTS = 5;

// timeout per cluster destruction attempt
const DESTROY_ATTEMPT_TIMEOUT_SECONDS = 60 * 20;

interface DestroyConfigInterface {
  cloudProvider: "gcp" | "aws";
  clusterName: string;
  gcpProjectID: string | undefined;
  gcpRegion: string | undefined;
  awsRegion: string | undefined;
}

// think of this as singleton (set once, immutable, read from everywhere)
let destroyConfig: DestroyConfigInterface;

export function setDestroyConfig(c: DestroyConfigInterface): void {
  destroyConfig = c;

  // Configure AWS client lib state with region information. Needs to be done
  // before using any AWS client lib (S3, EKS, ...). Could be done by the code
  // that also calls `setDestroyConfig()` but on the other hand, this can
  // also be done in here, which is a little cleaner.
  if (c.awsRegion !== undefined) {
    log.debug(
      "setDestroyConfig(): set AWS region for client libs: %s",
      c.awsRegion
    );
    setAWSRegion(c.awsRegion);
  }
}

export { destroyConfig };

async function getGKEKubeconfig(
  destroyConfig: DestroyConfigInterface
): Promise<KubeConfig | undefined> {
  const gkeCluster = await doesGKEClusterExist({
    opstraceClusterName: destroyConfig.clusterName
  });
  if (gkeCluster === false) {
    log.info(
      "GKE cluster corresponding to Opstrace cluster '%s' does not seem to exist.",
      destroyConfig.clusterName
    );
    return undefined;
  }

  const kstring = generateKubeconfigStringForGkeCluster(
    await getGcpProjectId(),
    gkeCluster
  );

  // Handle the case where the cluster fails to provision. In this situation we want
  // to proceed with infrastructure cleanup anyway.
  try {
    return getKubeConfig({
      loadFromCluster: false,
      kubeconfig: kstring
    });
  } catch (e) {
    log.warning(
      "Failed to fetch kubeconfig for GKE cluster: %s. Proceeding with infraestructure cleanup.",
      e.message
    );
    return undefined;
  }
}

async function getEKSKubeconfig(
  destroyConfig: DestroyConfigInterface
): Promise<KubeConfig | undefined> {
  const eksCluster = await doesEKSClusterExist({
    opstraceClusterName: destroyConfig.clusterName
  });
  if (eksCluster === false) {
    log.info(
      "EKS cluster corresponding to Opstrace cluster '%s' does not seem to exist.",
      destroyConfig.clusterName
    );
    return undefined;
  }

  // This assert statement might help more than doing
  // `destroyConfig.awsRegion!`.  When we get here this property must not be
  // `undefined`. With the current code paths it won't be, upon refactoring
  // this assert statement is hopefully more useful than the exclamation mark.
  assert(destroyConfig.awsRegion);

  const kstring = generateKubeconfigStringForEksCluster(
    destroyConfig.awsRegion,
    eksCluster
  );

  // Handle the case where the cluster fails to provision. In this situation we want
  // to proceed with infrastructure cleanup anyway.
  try {
    return getKubeConfig({
      loadFromCluster: false,
      kubeconfig: kstring
    });
  } catch (e) {
    log.warning(
      "Failed to fetch kubeconfig for EKS cluster: %s. Proceeding with infraestructure cleanup.",
      e.message
    );
    return undefined;
  }
}

async function getKubecfgIfk8sClusterExists(
  destroyConfig: DestroyConfigInterface
): Promise<KubeConfig | undefined> {
  switch (destroyConfig.cloudProvider) {
    case "gcp":
      return getGKEKubeconfig(destroyConfig);
    case "aws":
      return getEKSKubeconfig(destroyConfig);
    default:
      throw Error("must never be here");
  }
}

function* destroyClusterCore() {
  if (destroyConfig === undefined) {
    throw new Error("call setDestroyConfig() first");
  }

  const kubeconfig: KubeConfig | undefined = yield call(
    getKubecfgIfk8sClusterExists,
    destroyConfig
  );

  if (kubeconfig) {
    yield call(triggerk8sTeardown, kubeconfig);
  }

  if (destroyConfig.cloudProvider === "gcp") {
    yield call(destroyGCPInfra);
  }

  if (destroyConfig.cloudProvider === "aws") {
    yield call(destroyAWSInfra);
  }

  log.info(
    "Opstrace cluster teardown done for %s (%s)",
    destroyConfig.clusterName,
    destroyConfig.cloudProvider
  );
}

/**
 * The k8s cluster corresponding to the opstrace cluster is still running.
 * Trigger cluster-internal clean teardown, by changing the config for the
 * controller running in the cluster.
 */
function* triggerk8sTeardown(kubeConfig: KubeConfig) {
  // Explicitly test the availability of thek8s api and if interaction fails
  // skip the kubernetes teardown. The k8s cluster might already be gone.
  // Note(JP): the API might only temporarily be unavailable. Try harder?
  // what's the implication of not trying hard? We probably do not want to rely
  // in clean in-cluster teardown anyway. This here just carries the legacy
  // method on for now.
  try {
    yield call(k8sListNamespacesOrError, kubeConfig);
  } catch (e) {
    // Note(JP): this error handler needs to be changed to be more precise
    // instead of over-generalized: don't want to catch programming errors.
    log.info(
      "The k8s cluster might already be gone. Cannot interact with API: %s",
      e.message
    );
    return;
  }

  log.info("k8s cluster seems to exist, trigger clean cluster shutdown");

  log.info("Get current controller config map");
  const ccfg = yield call(getControllerConfig, kubeConfig);
  if (ccfg !== undefined) {
    ccfg.terminate = true;
    log.info("set controller config with terminate: true");
    yield call(saveControllerConfig, ccfg, kubeConfig);
  }

  log.info("starting kubernetes informers");
  const informers = yield fork(runInformers, kubeConfig);

  yield call(blockUntilCacheHydrated);

  const state: State = yield select();
  const controllerDeployment = state.kubernetes.cluster.Deployments.resources.find(
    d => d.name === CONTROLLER_NAME
  );

  if (controllerDeployment !== undefined) {
    log.info(
      "cluster has controller deployment: wait for controller to pick up state change and to initiate teardown"
    );
    log.debug(
      "controller deployment: %s",
      JSON.stringify(controllerDeployment, null, 2)
    );
  } else {
    // Note(JP): just putting my current understanding into this log msg
    log.info(
      "run the controller locally now, it will read the config map and start teardown(?)"
    );
  }

  log.info('wait for teardown to complete ("wait for deployments/..." phase)');
  yield call(uninstallProgressReporter);

  // Cancel the forked informers so we can exit
  yield cancel(informers);
}

/**
 * Timeout control around a single cluster teardown attempt.
 */
function* destroyClusterAttemptWithTimeout() {
  log.debug("destroyClusterAttemptWithTimeout");
  const { timeout } = yield race({
    destroy: call(destroyClusterCore),
    timeout: delay(DESTROY_ATTEMPT_TIMEOUT_SECONDS * SECOND)
  });

  if (timeout) {
    // Note that in this case redux-saga guarantees to have cancelled the
    // task(s) that lost the race, i.e. the `destroy` task above.
    // see https://redux-saga.js.org/docs/advanced/TaskCancellation.html
    // however, this does not seem to reliable cancel all tasks spawned along
    // the hierarchy, maybe as of usage of promises as part of the stack?
    // also see opstrace-prelaunch/issues/1457
    log.warning(
      "cluster teardown attempt timed out after %s seconds",
      DESTROY_ATTEMPT_TIMEOUT_SECONDS
    );
    throw new ClusterDestroyTimeoutError();
  }
}

function* rootTaskDestroy() {
  // Note(JP): a longish delay between attempts with the intention to give
  // deletion attempts some time to take effect holistically (sometimes, that
  // is our impression, deletion of an individual resource might be confirmed
  // synchronously, but after all still takes a while to be properly reflected
  // across all views).
  yield call(retryUponAnyError, {
    task: destroyClusterAttemptWithTimeout,
    maxAttempts: DESTROY_ATTEMPTS,
    doNotLogDetailForTheseErrors: [ClusterDestroyTimeoutError],
    actionName: "cluster teardown",
    delaySeconds: 30
  });
}

/**
 * Entry point for cluster teardown/destroy, to be called by CLI.
 */
export async function destroyCluster(
  smOnError: (e: Error, detail: any) => void
): Promise<void> {
  const sm = createSagaMiddleware({ onError: smOnError });
  createStore(rootReducer, applyMiddleware(sm));

  await sm.run(rootTaskDestroy).toPromise();

  // this is helpful when the runtime is supposed to crash but doesn't
  log.debug("end of destroyCluster()");
}
