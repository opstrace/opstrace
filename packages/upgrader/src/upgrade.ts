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

import { log } from "@opstrace/utils";
import {
  ControllerResourcesDeploymentStrategy,
  CONTROLLER_NAME,
  deployControllerResources
} from "@opstrace/controller-config";
import { CONTROLLER_IMAGE_DEFAULT } from "@opstrace/buildinfo";

import { State } from "./reducer";

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
