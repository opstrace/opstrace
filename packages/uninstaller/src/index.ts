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

import dns from "dns/promises";

import {
  select,
  fork,
  call,
  race,
  delay,
  cancel,
  Effect
} from "redux-saga/effects";
import { createStore, applyMiddleware } from "redux";
import createSagaMiddleware from "redux-saga";

import { KubeConfig } from "@kubernetes/client-node";
import { k8sListNamespacesOrError } from "@opstrace/kubernetes";

import { getGKEKubeconfig } from "@opstrace/gcp";

import { setAWSRegion, getEKSKubeconfig } from "@opstrace/aws";

import { log, SECOND, retryUponAnyError, sleep } from "@opstrace/utils";

import { DNSClient } from "@opstrace/dns";

import {
  CONTROLLER_NAME,
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

async function getKubecfgIfk8sClusterExists(
  destroyConfig: DestroyConfigInterface
): Promise<KubeConfig | undefined> {
  switch (destroyConfig.cloudProvider) {
    case "gcp":
      return getGKEKubeconfig(destroyConfig.clusterName);
    case "aws":
      return getEKSKubeconfig(
        destroyConfig.awsRegion!,
        destroyConfig.clusterName
      );
    default:
      throw Error("must never be here");
  }
}

function* destroyClusterCore(): Generator<Effect, void, any> {
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

  // First, try to determine if the  DNS name <instance_name>.opstrace.io
  // exists for this Opstrace instance name (it may not when it was set up with
  // a custom DNS name, which we are trying to find out here); and then attempt
  // DNS service entry deletion (which may fail after login, when it turns out
  // that <instance_name>.opstrace.io belongs to someone else, see #861 for
  // trade-off discussion). Note(JP): for manually preventing false positives,
  // maybe add a flag --skip-dns-service-login
  if (yield call(doesOpstraceIoDNSNameExist, destroyConfig.clusterName)) {
    const opstraceClient = yield call([DNSClient, DNSClient.getInstance]);
    yield call(
      [opstraceClient, opstraceClient.delete],
      destroyConfig.clusterName
    );
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
  //@ts-ignore: TS7075 generator lacks return type (TS 4.3)
  const ccfg = yield call(getControllerConfig, kubeConfig);
  if (ccfg !== undefined) {
    ccfg.terminate = true;
    log.info("set controller config with terminate: true");
    yield call(saveControllerConfig, ccfg, kubeConfig);
  }

  log.info("starting kubernetes informers");
  //@ts-ignore: TS7075 generator lacks return type (TS 4.3)
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
  smOnError: (e: Error, detail: unknown) => void
): Promise<void> {
  const sm = createSagaMiddleware({ onError: smOnError });
  createStore(rootReducer, applyMiddleware(sm));

  await sm.run(rootTaskDestroy).toPromise();

  // this is helpful when the runtime is supposed to crash but doesn't
  log.debug("end of destroyCluster()");
}

/**
 *
 * Examples:
 *
 * 1) NS record for foo.opstrace.io exists in *.opstrace.io DNS zone and points
 *    to the authoritative name servers in user's DNS zone: resolveNs() returns
 *    the set of authoritative name servers.
 *
 *      -> return true
 *
 * 2) NS record for bar.opstrace.io exists in *.opstrace.io DNS zone and points
 *    to a set of name servers that don't now that DNS name (user's DNS infra
 *    already cleaned up or never set up in the first place): resolveNs()
 *    interestingly emits an ESERVFAIL error (which kind of makes sense,
 *    because the seeminly authoritative name servers don't know the DNS name).
 *    It would be nicer to directly see the 'link', i.e. the _actual_ NS record
 *    set in the *.opstrace.io DNS zone, though.
 *
 *      -> return true
 *
 * 3) NS record for nono.opstrace.io does not exist in *.opstrace.io DNS zone:
 *    resolveNs() returns ENOTFOUND.
 *
 *      -> return false
 *
 *
 *  Tested with:
 *  records = await r.resolveNs("jp-devcluster2.opstrace.io"); -> record set
 *  records = await r.resolveNs("notexisting.opstrace.io"); -> ENOTFOUND
 *  records = await r.resolveNs("prs-bk-4987-861-a.opstrace.io"); -> ESERVFAIL
 *
 * For all other errors returned by resolveNs(), perform a retry (we will learn
 * if there are more of those situations 1, 2, 3 above that map onto different
 * error codes)
 */

export async function doesOpstraceIoDNSNameExist(
  instanceName: string
): Promise<boolean> {
  log.info(
    "DNS service teardown: try to determine if an NS record set " +
      "exists in the *.opstrace.io DNS zone for DNS name " +
      `${instanceName}.opstrace.io.`
  );

  const dn = `${instanceName}.opstrace.io`;

  // DNS query timeout: defined in milliseconds.
  const r = new dns.Resolver({ timeout: 10000 });

  let attempt = 0;
  while (true) {
    attempt++;

    let records: string[];
    try {
      // Try to see if there is an NS record set for ${instanceName}.opstrace.io in
      // the *.opstrace.io zone (managed by Opstrace).
      // Note that this does not use OS facilities, but the DNS client
      // built into NodeJS stdlib.
      // Also see https://nodejs.org/docs/latest-v16.x/api/dns.html#dns_error_codes
      records = await r.resolveNs(dn);
    } catch (e) {
      // Use the syscall property to separate programming errors from errors
      // thrown _within_ resolveNs().
      if (e.syscall === "queryNs") {
        if (e.code === "ESERVFAIL") {
          // Note(JP): documented with "DNS server returned general failure",
          // which I've found to include the situation where the seemingly
          // _authoritative_ name servers do not know anything about the
          // DNS name in question.
          log.info(
            `DNS service teardown: NS record query attempt ${attempt}: ` +
              "ESERVFAIL. Assume that NS record set exists on the *.opstrace.io " +
              "DNS zone, but that the corresponding name servers do not " +
              `know about ${dn} (anymore).`
          );
          return true;
        } else if (e.code === "ENOTFOUND") {
          log.info(
            `DNS service teardown: NS record query attempt ${attempt}: ` +
              `ENOTFOUND. NS record set for ${dn} does not exist on ` +
              "the *.opstrace.io DNS zone."
          );
          return false;
        } else {
          log.info(
            `DNS service teardown: NS record query attempt ${attempt}: ${e.message} -- retry in 5 s`
          );
          await sleep(5.0);
          continue;
        }
      } else {
        // This is meant to catch _only_ programming errors.
        throw e;
      }
    }

    if (records.length > 0) {
      log.debug("record set: %s", records);
      log.info(
        `DNS service teardown: NS record query attempt ${attempt}: ` +
          `NS record set exists for ${dn} on the *.opstrace.io DNS zone.`
      );
      return true;
    }

    // Is this possible? Meaning that there is no NS record set?
    log.warning(
      `DNS service teardown: NS record query attempt ${attempt}: ` +
        `empty record set -- unexpected situation. Retry in 5 seconds.`
    );
    await sleep(5.0);
  }
}
