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

import { all, select, call, Effect } from "redux-saga/effects";
import { KubeConfig } from "@kubernetes/client-node";

import { getClusterConfig } from "@opstrace/config";
import { log, die, BUILD_INFO } from "@opstrace/utils";
import {
  ControllerResourcesDeploymentStrategy,
  CONTROLLER_NAME,
  deployControllerResources,
  CONFIGMAP_NAME,
  LatestControllerConfigType,
  STORAGE_KEY,
  set as updateControllerConfig,
  upgradeControllerConfigMapToLatest
} from "@opstrace/controller-config";

import { Deployment, K8sResource, updateResource } from "@opstrace/kubernetes";

import {
  EnsureInfraExistsResponse,
  ensureAWSInfraExists,
  ensureGCPInfraExists
} from "@opstrace/installer";

import { State } from "./reducer";
import { getValidatedGCPAuthOptionsFromFile } from "@opstrace/gcp";
import { waitForControllerDeployment } from "./readiness";

const CONTROLLER_IMAGE_DEFAULT = `opstrace/controller:${BUILD_INFO.VERSION_STRING}`;

//
// Set the controller deployment image version to the one defined in buildinfo.
// Returns boolean to indicate controller deployment rollout initiated or not.
export function* upgradeControllerDeployment(config: {
  opstraceClusterName: string;
  kubeConfig: KubeConfig;
}): Generator<Effect, boolean, State> {
  // Exit if controller deployment does not exist.
  const state: State = yield select();
  const { Deployments } = state.kubernetes.cluster;
  const cd = Deployments.resources.find(d => d.name === CONTROLLER_NAME);

  if (cd === undefined) {
    throw new Error("controller deployment not found");
  }

  const installedVersion = cd.spec.spec!.template.spec!.containers[0].image;

  if (installedVersion === CONTROLLER_IMAGE_DEFAULT) {
    log.info(
      `controller image is already at desired version: ${CONTROLLER_IMAGE_DEFAULT}`
    );
    return false;
  }

  log.info(
    `upgrading controller image from ${installedVersion} to ${CONTROLLER_IMAGE_DEFAULT}`
  );

  yield call(deployControllerResources, {
    controllerImage: CONTROLLER_IMAGE_DEFAULT,
    opstraceClusterName: config.opstraceClusterName,
    kubeConfig: config.kubeConfig,
    deploymentStrategy: ControllerResourcesDeploymentStrategy.Update
  });

  return true;
}

export function* upgradeControllerConfigMap(
  kubeConfig: KubeConfig
): Generator<Effect, void, State> {
  const state: State = yield select();
  const cm = state.kubernetes.cluster.ConfigMaps.resources.find(
    cm => cm.name === CONFIGMAP_NAME
  );
  if (cm === undefined) {
    die(`could not find Opstrace controller config map`);
  }

  const cfgJSON = JSON.parse(cm.spec.data?.[STORAGE_KEY] ?? "");
  if (cfgJSON === "") {
    die(`invalid Opstrace controller config map`);
  }

  log.debug(`controller config: ${JSON.stringify(cfgJSON, null, 2)}`);

  let cfg: LatestControllerConfigType;
  try {
    cfg = upgradeControllerConfigMapToLatest(cfgJSON);
  } catch (e) {
    die(`failed to upgrade controller configuration: ${e.message}`);
  }

  //
  // At this point, override any new fields that require reading from the user
  // cluster config.
  //
  const ucc = getClusterConfig();
  // custom_auth0_client_id was introduced to be able to configure the Auth0
  // client id. CI uses it to automate the login flow using email and password.
  cfg.custom_auth0_client_id = ucc.custom_auth0_client_id;

  log.debug(`upgraded controller config ${JSON.stringify(cfg, null, 2)}`);

  yield call(updateControllerConfig, cfg, kubeConfig);
}

export function* upgradeInfra(cloudProvider: string) {
  switch (cloudProvider) {
    case "aws": {
      const res: EnsureInfraExistsResponse = yield call(ensureAWSInfraExists);
      log.debug(`upgraded infra results: ${JSON.stringify(res)}`);
      break;
    }
    case "gcp": {
      const gcpCredFilePath: string = process.env[
        "GOOGLE_APPLICATION_CREDENTIALS"
      ]!;
      const gcpAuthOptions = getValidatedGCPAuthOptionsFromFile(
        gcpCredFilePath
      );

      const res: EnsureInfraExistsResponse = yield call(
        ensureGCPInfraExists,
        gcpAuthOptions
      );

      log.debug(`upgraded infra results: ${JSON.stringify(res)}`);
      break;
    }
    default:
      die(`cloud provider not supported: ${cloudProvider}`);
  }
}
// Generator< AllEffect<void[]> | CallEffect<void> | any, void, any>
export function* cortexOperatorPreamble(
  kubeConfig: KubeConfig
): Generator<any, void, any> {
  const state: State = yield select();
  const deploy = state.kubernetes.cluster.Deployments.resources.find(
    d => d.name === CONTROLLER_NAME
  );
  if (deploy === undefined) {
    die(`could not find Opstrace controller deployment`);
  }

  // disable opstrace controller to be able to transfer ownership of cortex
  // deployment to the cortex-operator; it will be enabled later when the
  // upgrade command deploys the new controller image.
  if (deploy.spec.spec!.replicas! > 0) {
    yield call(stopOpstraceController, deploy, kubeConfig);
    yield call(waitForControllerDeployment, {
      desiredReadyReplicas: undefined
    });
  }

  // Set all the resources the cortex-operator will assume ownership of as
  // immutable. This way the opstrace controller won't try and delete them
  // durint the reconcile loop when it restarts. When the cortex-operator takes
  // ownership of the resource it'll clear the annotation.
  yield call(transferOwnership, state, kubeConfig);
}

async function stopOpstraceController(
  deploy: Deployment,
  kubeConfig: KubeConfig
): Promise<void> {
  deploy.spec.spec!.replicas = 0;
  const resource = new Deployment(
    {
      kind: deploy.spec.kind,
      apiVersion: deploy.spec.apiVersion,
      metadata: {
        name: deploy.spec.metadata?.name,
        namespace: deploy.spec.metadata?.namespace,
        annotations: deploy.spec.metadata?.annotations,
        labels: deploy.spec.metadata?.labels
      },
      spec: deploy.spec.spec
    },
    kubeConfig
  );

  await updateResource(resource);
}
async function setImmutable(r: K8sResource): Promise<void> {
  // Set the resource to immmutable so the opstrace controller doesn't delete it
  // when it reconciles all the resources. when the cortex operator takes
  // ownership of the resource this annotation is deleted.
  r.setImmutable();
  await updateResource(r);
}

function* transferOwnership(
  state: State,
  kubeConfig: KubeConfig
): Generator<any, void, any> {
  const stsToSkip = [
    "memcached" // renamed by cortex-operator
  ];
  const sts = state.kubernetes.cluster.StatefulSets.resources.filter(
    s => s.namespace === "cortex" && !stsToSkip.some(n => n === s.name)
  );
  yield all(sts.map(setImmutable));

  const deployToSkip = ["configs"];
  let deployments = state.kubernetes.cluster.Deployments.resources.filter(
    deploy =>
      deploy.namespace === "cortex" &&
      !deployToSkip.some(n => n === deploy.name)
  );
  deployments = deployments.map(
    d =>
      new Deployment(
        {
          kind: d.spec.kind,
          apiVersion: d.spec.apiVersion,
          metadata: {
            name: d.spec.metadata?.name,
            namespace: d.spec.metadata?.namespace,
            annotations: d.spec.metadata?.annotations,
            labels: d.spec.metadata?.labels
          },
          spec: d.spec.spec
        },
        kubeConfig
      )
  );
  yield all(deployments.map(setImmutable));

  const svcToSkip = ["loki-gossip-ring", "memcached", "configs"];
  const svc = state.kubernetes.cluster.Services.resources.filter(
    svc => svc.namespace === "cortex" && !svcToSkip.some(n => n === svc.name)
  );
  yield all(svc.map(setImmutable));

  const sa = state.kubernetes.cluster.ServiceAccounts.resources.filter(
    sa => sa.namespace === "cortex" && sa.name === "cortex"
  );
  yield all([sa.map(setImmutable)]);

  const cm = state.kubernetes.cluster.ConfigMaps.resources.filter(
    cm => cm.namespace === "cortex" && cm.name === "cortex-config"
  );
  yield all([cm.map(setImmutable)]);

  // Delete the following deployments because we cannot update the match label
  // selector.
  const deleteDeployments = ["distributor", "querier", "query-frontend"];
  deployments = state.kubernetes.cluster.Deployments.resources.filter(
    deploy =>
      deploy.namespace === "cortex" &&
      deleteDeployments.some(n => n === deploy.name)
  );
  yield all(deployments.map(d => d.delete()));
}
