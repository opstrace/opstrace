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

// import { CallEffect } from "redux-saga/effects";

import { ConfigMap, ResourceCollection } from "@opstrace/kubernetes";
import { State } from "../reducer";
import { ControllerOverrides, getControllerOverrides } from "../helpers";
import { log } from "@opstrace/utils";

export function override(state: State, desired: ResourceCollection): void {
  const cm: ConfigMap | undefined =
    state.kubernetes.cluster.ConfigMaps.resources.find(
      cm =>
        cm.namespace === "default" &&
        cm.name === "opstrace-controller-config-overrides"
    );

  if (!cm) {
    log.debug("Controller config with overrides not found. Skipping.");
    return;
  }

  const overrides = getControllerOverrides(cm);
  if (overrides.size === 0) {
    log.debug("No controller config overrides set. Skipping.");
    return;
  }

  log.debug(`overrides: JSON.stringify(overrides)`);

  overrideHelper(overrides, desired);
}

// overrideHelper is a helper function to help with unit tests since it was
// surprisingly hard to mock State in the unit tests. It is exported so that we
// can use it in the override.spec.ts tests.
//
// Given a set of overrides, loop over the list of desired resources and apply
// the overrides.
export function overrideHelper(
  overrides: ControllerOverrides,
  desired: ResourceCollection
): void {
  const arr = desired.get();
  arr.forEach(part => {
    const key = `${part.kind}__${part.namespace}__${part.name}`;
    const o = overrides[key];

    if (o) {
      log.debug(`found ${key}, merging object with ${o}`);
      part.override(o);
    }
  });
}
