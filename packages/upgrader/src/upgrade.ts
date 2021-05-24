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

import { select, call } from "redux-saga/effects";
import { KubeConfig } from "@kubernetes/client-node";

import { log, die } from "@opstrace/utils";
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
import { CONTROLLER_IMAGE_DEFAULT } from "@opstrace/buildinfo";

import {
  EnsureInfraExistsResponse,
  ensureAWSInfraExists,
  ensureGCPInfraExists
} from "@opstrace/installer";

import { State } from "./reducer";
import { getValidatedGCPAuthOptionsFromFile } from "@opstrace/gcp";

//
// Set the controller deployment image version to the one defined in buildinfo.
//
///eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function* upgradeControllerDeployment(config: {
  opstraceClusterName: string;
  kubeConfig: KubeConfig;
}) {
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
    return;
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
}

export function* upgradeControllerConfigMap(kubeConfig: KubeConfig) {
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
