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

import { all } from "redux-saga/effects";

import { KubeConfig } from "@kubernetes/client-node";
import { createResource } from "@opstrace/kubernetes";

import { ControllerResources } from "../resources/controller";

export function* deployControllerResources(config: {
  controllerImage: string;
  opstraceClusterName: string;
  mode: "development" | "production";
  kubeConfig: KubeConfig;
}) {
  const resources = ControllerResources(config)
    .get()
    .map(r => {
      // Protect these resources so we don't ever terminate them in the reconcile loop
      r.setOwnership({ protect: true });
      return r;
    });

  yield all([resources.map(createResource)]);
}
