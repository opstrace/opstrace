/**
 * Copyright 2019-2021 Opstrace, Inc.
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
import { strict as assert } from "assert";

import got, { Response as GotResponse, Options as GotOptions } from "got";
import { fork, call, race, delay, cancel } from "redux-saga/effects";
import { createStore, applyMiddleware } from "redux";
import createSagaMiddleware from "redux-saga";

import {
  log,
  sleep,
  SECOND,
  die,
  retryUponAnyError,
  Dict
} from "@opstrace/utils";

import {
  getTenantsConfig,
  getFirewallConfig,
  getClusterConfig,
  getDnsConfig,
  NewRenderedClusterConfigType
} from "@opstrace/config";

import { getKubeConfig, k8sListNamespacesOrError } from "@opstrace/kubernetes";

import {
  getValidatedGCPAuthOptionsFromFile,
  GCPAuthOptions,
  getCertManagerServiceAccount,
  getExternalDNSServiceAccount,
  getCortexServiceAccount,
  getLokiServiceAccount
} from "@opstrace/gcp";
import { set as updateTenantsConfig } from "@opstrace/tenants";
import {
  set as updateControllerConfig,
  ControllerConfigType,
  controllerConfigSchema
} from "@opstrace/controller-config";
import { deployControllerResources } from "@opstrace/controller";

import { rootReducer } from "./reducer";
import { ensureGCPInfraExists } from "./gcp";
import {
  ensureAWSInfraExists,
  waitUntilRoute53EntriesAreAvailable
} from "./aws";
import { ClusterCreateTimeoutError } from "./errors";
import { runInformers } from "./informers";
import {
  installationProgressReporter,
  waitForControllerDeployment
} from "./readiness";
import { storeSystemTenantApiAuthTokenAsSecret } from "./secrets";
import { EnsureInfraExistsResponse } from "./types";

// GCP-specific cluster creation code can rely on this being set. First I tried
// to wrap this into the non-user-given cluster config schema but then realized
// that this is _part_ of credentials, and really just some detail parameter
// used at runtime that has little to do with "config": users provide svc acc
// credentials and these implicitly define the gcp project ID.
let gcpProjectID: string;
export function setGcpProjectID(p: string): void {
  gcpProjectID = p;
}
export { gcpProjectID };

// configuration for the cluster creation process which does _not_ belong
// semantically to the cluster config itself.
export interface ClusterCreateConfigInterface {
  // if true, will not deploy the controller. This is useful for running the controller locally instead during development.
  holdController: boolean;
  // tenant name : api token map, can be empty
  tenantApiTokens: Dict<string>;
  // if set, write a KUBECONFIG file to this path, asap after k8s cluster
  // has been provisioned.
  kubeconfigFilePath: string;
}

let clusterCreateConfig: ClusterCreateConfigInterface;
export function setCreateConfig(c: ClusterCreateConfigInterface): void {
  clusterCreateConfig = c;
}

// number of Opstrace cluster creation attempts
const CREATE_ATTEMPTS = 3;

// timeout per attempt
const CREATE_ATTEMPT_TIMEOUT_SECONDS = 60 * 40;

function* createClusterCore() {
  const ccfg: NewRenderedClusterConfigType = getClusterConfig();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const gcpCredFilePath: string = process.env[
    "GOOGLE_APPLICATION_CREDENTIALS"
  ]!;

  const firewallConf = getFirewallConfig({
    api: ccfg.data_api_authorized_ip_ranges
  });
  const retentionConf = {
    logs: ccfg.log_retention_days,
    metrics: ccfg.metric_retention_days
  };

  let gcpAuthOptions: GCPAuthOptions | undefined;

  // not sure why the controller needs to know about 'region', but here we go.
  let region: string;

  if (ccfg.cloud_provider === "gcp") {
    // note: legacy, tmp state, when we are in this routine the
    // GOOGLE_APPLICATION_CREDENTIALS env variable is set to an existing file,
    // and basic content validation has already been performed. details from
    // the file, such as project ID, will be set on global config object. this
    // is only here to keep following code working w/o change.
    gcpAuthOptions = getValidatedGCPAuthOptionsFromFile(gcpCredFilePath);

    if (ccfg.gcp === undefined) {
      throw Error("`gcp` property expected");
    }

    region = ccfg.gcp.region;
  } else {
    assert(ccfg.cloud_provider === "aws");

    if (ccfg.aws === undefined) {
      throw Error("`aws` property expected");
    }

    // set `region` (legacy code maintenance, clean up)
    region = ccfg.aws.region;
  }

  const dnsConf = getDnsConfig(ccfg.cloud_provider);

  // Fail fast if specified controller docker image cannot be found on docker
  // hub, see https://github.com/opstrace/opstrace/issues/1298.
  let controllerConfig: ControllerConfigType = {
    name: ccfg.cluster_name,
    target: ccfg.cloud_provider,
    region: region, // not sure why that's needed
    cert_issuer: ccfg.cert_issuer,
    envLabel: ccfg.env_label,
    infrastructureName: ccfg.cluster_name,
    logRetention: retentionConf.logs,
    metricRetention: retentionConf.metrics,
    dnsName: dnsConf.dnsName,
    terminate: false,
    controllerTerminated: false,
    tlsCertificateIssuer: ccfg.cert_issuer,
    uiSourceIpFirewallRules: firewallConf.ui,
    apiSourceIpFirewallRules: firewallConf.api,
    data_api_authn_pubkey_pem: ccfg.data_api_authn_pubkey_pem,
    disable_data_api_authentication: ccfg.data_api_authentication_disabled
  };

  log.debug("validate controller config");

  // "Strict schemas skip coercion and transformation attempts, validating the value "as is"."
  // This is mainly to error out upon unexpected parameters: to 'enforce' yup's
  // noUnknown, see
  // https://github.com/jquense/yup/issues/829#issuecomment-606030995
  // https://github.com/jquense/yup/issues/697
  controllerConfigSchema.validateSync(controllerConfig, { strict: true });

  if (!clusterCreateConfig.holdController) {
    yield call(checkIfDockerImageExistsOrErrorOut, ccfg.controller_image);
  }

  let kubeconfigString = "";
  let postgreSQLEndpoint = "";
  let opstraceDBName = "";

  if (ccfg.cloud_provider === "gcp") {
    if (!gcpAuthOptions) {
      throw Error("could not location authentication credentials for gcp");
    }
    const res: EnsureInfraExistsResponse = yield call(
      ensureGCPInfraExists,
      gcpAuthOptions
    );
    kubeconfigString = res.kubeconfigString;
    postgreSQLEndpoint = res.postgreSQLEndpoint;
    opstraceDBName = res.opstraceDBName;

    controllerConfig.gcp = {
      projectId: gcpAuthOptions.projectId,
      certManagerServiceAccount: getCertManagerServiceAccount(),
      externalDNSServiceAccount: getExternalDNSServiceAccount(),
      cortexServiceAccount: getCortexServiceAccount(),
      lokiServiceAccount: getLokiServiceAccount()
    };
  }
  if (ccfg.cloud_provider === "aws") {
    const res: EnsureInfraExistsResponse = yield call(ensureAWSInfraExists);
    kubeconfigString = res.kubeconfigString;
    postgreSQLEndpoint = res.postgreSQLEndpoint;

    if (!res.certManagerRoleArn) {
      throw Error("must return the certManagerRoleArn from aws infra install");
    }

    controllerConfig.aws = {
      certManagerRoleArn: res.certManagerRoleArn
    };
  }

  // Update our controllerConfig with the Postgress Endpoint and revalidate for good measure
  controllerConfig = {
    ...controllerConfig,
    postgreSQLEndpoint,
    opstraceDBName
  };
  controllerConfigSchema.validateSync(controllerConfig, { strict: true });

  if (!kubeconfigString) {
    throw Error("couldn't compute a kubeconfig");
  }

  const kubeConfig = getKubeConfig({
    loadFromCluster: false,
    kubeconfig: kubeconfigString
  });

  // If asked for by the user, write out the kubeconfig to a file, so that they
  // can start interacting with the k8s cluster (misc integration).
  if (clusterCreateConfig.kubeconfigFilePath !== "") {
    const path = clusterCreateConfig.kubeconfigFilePath;
    log.info("try to write kubeconfig to file: %s", path);
    try {
      fs.writeFileSync(path, kubeconfigString, { encoding: "utf8" });
    } catch (err) {
      // This is not critical for cluster creation, just convenience. Log
      // how/why writing failed, otherwise proceed
      log.warning(
        "could not write kubeconfig to file %s: %s: %s",
        path,
        err.code,
        err.message
      );
    }
  }

  // Try to interact with the k8s API (for debugging, kept from legacy code)
  try {
    yield call(k8sListNamespacesOrError, kubeConfig);
  } catch (err) {
    log.warning(
      "problem when interacting with the k8s cluster (thrown by k8sListNamespacesOrError): %s",
      err
    );
  }

  const tenantsConfig = getTenantsConfig(ccfg.tenants);
  yield call(updateControllerConfig, controllerConfig, kubeConfig);
  yield call(updateTenantsConfig, tenantsConfig, kubeConfig);

  let systemTenantAuthToken = clusterCreateConfig.tenantApiTokens["system"];

  // Always deploy secret (so that the systemlog deployment config does not
  // depend on whether or not this is set). Just set a dummy value in case
  // tenant API authentication is disabled.
  if (systemTenantAuthToken === undefined) {
    assert(ccfg.data_api_authentication_disabled);
    systemTenantAuthToken = "not-required";
  }

  yield call(
    storeSystemTenantApiAuthTokenAsSecret,
    systemTenantAuthToken,
    kubeConfig
  );

  if (clusterCreateConfig.holdController) {
    log.info(
      `Not deploying controller. Raw cluster creation finished: ${ccfg.cluster_name} (${ccfg.cloud_provider})`
    );
    return;
  }

  log.info("deploying controller");
  yield call(deployControllerResources, {
    controllerImage: ccfg.controller_image,
    opstraceClusterName: ccfg.cluster_name,
    kubeConfig
  });

  log.info("starting k8s informers");
  const informers = yield fork(runInformers, kubeConfig);

  yield call(waitForControllerDeployment);

  yield call(installationProgressReporter);

  // `informers` is a so-called attached fork. Cancel this task.
  yield cancel(informers);

  if (ccfg.cloud_provider == "aws") {
    yield call(
      waitUntilRoute53EntriesAreAvailable,
      ccfg.cluster_name,
      ccfg.tenants
    );
  }

  yield call(
    waitUntilDataAPIEndpointsAreReachable,
    ccfg.cluster_name,
    ccfg.tenants
  );
  yield call(
    waitUntilDDAPIEndpointsAreReachable,
    ccfg.cluster_name,
    ccfg.tenants
  );
  yield call(waitUntilUIIsReachable, ccfg.cluster_name, ccfg.tenants);

  log.info(
    `cluster creation finished: ${ccfg.cluster_name} (${ccfg.cloud_provider})`
  );
  log.info(`Log in here: https://${ccfg.cluster_name}.opstrace.io`);
}

/**
 * Confirm DNS-reachability, and also readiness of deployments. k8s
 * cluster-internal readiness wasn't always enough, see opstrace-prelaunch/issues/1245 and related
 * issues.
 */
export async function waitUntilDataAPIEndpointsAreReachable(
  opstraceClusterName: string,
  tenantNames: string[]
): Promise<void> {
  // key: unique url, value: corresponding tenant name
  const probeUrls: Dict<string> = {};

  // system tenant is there by default, check corresponding endpoints, too
  const tnames = [...tenantNames];
  tnames.push("system");

  for (const tname of tnames) {
    const mid = `${tname}.${opstraceClusterName}.opstrace.io`;
    // opstrace-prelaunch/issues/1570
    probeUrls[`https://cortex.${mid}/api/v1/labels`] = tname;
    probeUrls[`https://loki.${mid}/loki/api/v1/labels`] = tname;
  }

  log.info(
    "waiting for expected HTTP responses at these URLs: %s",
    JSON.stringify(probeUrls, null, 2)
  );
  const actors = [];
  for (const [probeUrl, tenantName] of Object.entries(probeUrls)) {
    actors.push(waitForProbeURL(probeUrl, tenantName, 200, true));
  }
  await Promise.all(actors);
  log.info(
    "wait for data API endpoints: all probe URLs returned expected HTTP responses, continue"
  );
}

export async function waitUntilDDAPIEndpointsAreReachable(
  opstraceClusterName: string,
  tenantNames: string[]
): Promise<void> {
  // Do not check for system tenant (not deployed for it).
  // key: unique url, value: corresponding tenant name
  const probeUrls: Dict<string> = {};

  for (const tname of tenantNames) {
    const mid = `${tname}.${opstraceClusterName}.opstrace.io`;
    // opstrace-prelaunch/issues/1570
    probeUrls[`https://dd.${mid}/api/v1/series`] = tname;
  }

  log.info(
    "waiting for expected HTTP responses at these URLs: %s",
    JSON.stringify(probeUrls, null, 2)
  );
  const actors = [];
  for (const [probeUrl, tenantName] of Object.entries(probeUrls)) {
    actors.push(waitForProbeURL(probeUrl, tenantName, 405, false, true, true));
  }
  await Promise.all(actors);
  log.info(
    "wait for DD API endpoints: all probe URLs returned expected HTTP responses, continue"
  );
}

export async function waitUntilUIIsReachable(
  opstraceClusterName: string,
  tenantNames: string[]
): Promise<void> {
  // key: unique url, value: corresponding tenant name
  const probeUrls: Dict<string> = {};

  // system tenant is there by default, check corresponding endpoints, too
  const tnames = [...tenantNames];
  tnames.push("system");

  // As of today this actually checks for Grafana, HTTP 200 response with
  // body `<a href="/grafana/login">Found</a>.` is expected.
  for (const tname of tnames) {
    probeUrls[`https://${tname}.${opstraceClusterName}.opstrace.io/`] = tname;
  }

  log.info(
    "waiting for expected HTTP responses at these URLs: %s",
    JSON.stringify(probeUrls, null, 2)
  );
  const actors = [];
  for (const [probeUrl, tenantName] of Object.entries(probeUrls)) {
    // Do not inspect JSON in response, do not enrich request with
    // authentication proof.
    actors.push(waitForProbeURL(probeUrl, tenantName, 200, false, false));
  }
  await Promise.all(actors);
  log.info(
    "wait for grafana endpoints: all probe URLs returned expected HTTP responses, continue"
  );
}

async function waitForProbeURL(
  probeUrl: string,
  tenantName: string,
  expectedRespCode: number,
  expectStatusSuccessJSON = false,
  presentOpstraceAuthToken = true,
  ddAuthScheme = false // DD-specific method for presenting the auth token
) {
  const requestSettings: GotOptions = {
    throwHttpErrors: false,
    retry: 0,
    https: { rejectUnauthorized: false },
    timeout: {
      connect: 3000,
      request: 10000
    }
  };

  // Copy common request settings, add authentication proof if required.
  const rs: GotOptions = { ...requestSettings };
  const tenantAuthToken = clusterCreateConfig.tenantApiTokens[tenantName];
  if (presentOpstraceAuthToken) {
    if (tenantAuthToken !== undefined) {
      // The authentication scheme depends on the API in use. TODO?: Maybe make
      // the DD API support the header-based authn scheme, too.
      if (ddAuthScheme) {
        probeUrl = `${probeUrl}?api_key=${tenantAuthToken}`;
      } else {
        rs.headers = { Authorization: `Bearer ${tenantAuthToken}` };
      }
    }
  }

  let attempt = 0;
  while (true) {
    attempt++;

    let resp: GotResponse<string>;
    try {
      //@ts-ignore `got(probeUrl, rs)` returns `unknown` from tsc's point of view
      resp = await got(probeUrl, rs);
    } catch (e) {
      if (e instanceof got.RequestError) {
        // Assume that for most of the 'waiting time' the probe fails in this
        // error handler.

        // When the debug log level is active then I think it's the right
        // thing to log every negative probe outcome as it happens (e.g. DNS
        // resolution error or TCP connection timeout).
        log.debug(`${probeUrl}: HTTP request failed with: ${e.message}`);

        // But on info level just emit the fact that the expected outcome is
        // still being waited for, every now and then (maybe every ~20
        // seconds).
        if (attempt % 5 === 0) {
          log.info(
            `${probeUrl}: still waiting for expected signal. Last error: ${e.message}`
          );
        }

        await sleep(5.0);
        continue;
      } else {
        throw e;
      }
    }

    if (resp.statusCode == expectedRespCode) {
      if (!expectStatusSuccessJSON) {
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any;
      try {
        data = JSON.parse(resp.body);
      } catch (err) {
        log.debug(`${probeUrl}: JSON deserialization err: ${err.message}`);
      }

      if (data && data.status !== undefined) {
        if (data.status == "success") {
          log.info(`${probeUrl}: got expected HTTP response`);
          return;
        }
        log.info(`${probeUrl}: JSON doc 'status': ${data.status}`);
      }
    }

    log.debug(`HTTP response details:
status: ${resp.statusCode}
body[:500]: ${resp.body.slice(0, 500)}`);

    if (attempt % 2 === 0) {
      log.info(`${probeUrl}: still waiting, unexpected HTTP response`);
    }

    await sleep(5.0);
  }
}

/**
 * Timeout control around a single cluster creation attempt.
 */
function* createClusterAttemptWithTimeout() {
  log.debug("createClusterAttemptWithTimeout");
  const { timeout } = yield race({
    create: call(createClusterCore),
    timeout: delay(CREATE_ATTEMPT_TIMEOUT_SECONDS * SECOND)
  });

  if (timeout) {
    // Note that in this case redux-saga guarantees to have cancelled the
    // task(s) that lost the race, i.e. the `create` task above.
    log.warning(
      "cluster creation attempt timed out after %s seconds",
      CREATE_ATTEMPT_TIMEOUT_SECONDS
    );
    throw new ClusterCreateTimeoutError();
  }
}

function* rootTaskCreate() {
  yield call(retryUponAnyError, {
    task: createClusterAttemptWithTimeout,
    maxAttempts: CREATE_ATTEMPTS,
    doNotLogDetailForTheseErrors: [ClusterCreateTimeoutError],
    actionName: "cluster creation",
    delaySeconds: 10
  });
}

/**
 * Entry point for cluster creation, to be called by CLI.
 */
export async function createCluster(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  smOnError: (e: Error, detail: any) => void
): Promise<void> {
  const sm = createSagaMiddleware({ onError: smOnError });

  createStore(rootReducer, applyMiddleware(sm));
  await sm.run(rootTaskCreate).toPromise();

  // this is helpful when the runtime is supposed to crash but doesn't
  log.debug("end of createCluster()");
}

/**
 * Check if docker image exists on docker hub. `imageName` is expected to
 * define both the repository and the image tag, separated with a colon.
 *
 * Exit process when image name does not satisfy that requirement or when image
 * does not exist.
 *
 * Note: this is just a pragmatic check trying to help with a workflow trap,
 * may want to allow for overriding this check. Also, upon umbiguous signal
 * (not one of 200 or 404 reponse) do not error out.
 */
async function checkIfDockerImageExistsOrErrorOut(imageName: string) {
  log.info("check if docker image exists on docker hub: %s", imageName);
  const splits = imageName.split(":");
  if (splits.length != 2) {
    die("unexpected controller image name");
  }
  const repo = splits[0];
  const imageTag = splits[1];

  const probeUrl = `https://hub.docker.com/v2/repositories/${repo}/tags/${imageTag}/`;
  const requestSettings = {
    throwHttpErrors: false,
    retry: 3,
    timeout: {
      connect: 3000,
      request: 10000
    }
  };

  let resp: GotResponse<string> | GotResponse<Buffer> | undefined;

  try {
    resp = await got(probeUrl, requestSettings);
  } catch (e) {
    if (e instanceof got.RequestError) {
      log.info(
        `could not detect presence of docker image: ${e.message} -- ignored, proceed`
      );
      return;
    } else {
      throw e;
    }
  }

  if (resp && resp.statusCode == 404) {
    die(
      "docker image not present on docker hub: you might want to push that first"
    );
  }

  if (resp && resp.statusCode == 200) {
    log.info("docker image present on docker hub, continue");
    return;
  }

  log.info("unexpected response, ignore");
  log.debug("respo status code: %s", resp.statusCode);

  if (resp.body) {
    // `slice()` works regardless of Buffer or string.
    let bodyPrefix = resp.body.slice(0, 500);
    // If buffer: best-effort decode the buffer into text (this method does _not_
    // not blow up upon unexpected byte sequences).
    if (Buffer.isBuffer(bodyPrefix)) bodyPrefix = bodyPrefix.toString("utf-8");
    log.debug(`response body, first 500 bytes: ${bodyPrefix}`);
  }
}
