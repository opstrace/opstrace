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

import { all, AllEffect } from "redux-saga/effects";

import { KubeConfig } from "@kubernetes/client-node";
import { createResource, updateResource } from "@opstrace/kubernetes";
import { log } from "@opstrace/utils";

import { ControllerResources } from "../resources/controller";

export enum ControllerResourcesDeploymentStrategy {
  Create = 1,
  Update
}

export function* deployControllerResources(config: {
  controllerImage: string;
  opstraceClusterName: string;
  kubeConfig: KubeConfig;
  deploymentStrategy: ControllerResourcesDeploymentStrategy;
}): Generator<AllEffect<Promise<void>[]>, void, unknown> {
  const resources = ControllerResources(config)
    .get()
    .map(r => {
      // Protect these resources so we don't ever terminate them in the reconcile loop
      r.setManagementOption({ protect: true });
      return r;
    });

  resources.forEach(r => {
    log.debug(JSON.stringify(r));
  });

  switch (config.deploymentStrategy) {
    case ControllerResourcesDeploymentStrategy.Create: {
      log.debug("creating controller resources");
      yield all([resources.map(createResource)]);
      break;
    }

    case ControllerResourcesDeploymentStrategy.Update: {
      log.debug("updating controller resources");
      yield all([resources.map(updateResource)]);
      break;
    }

    default: {
      throw new Error("invalid controller resource deployment strategy");
    }
  }
}
