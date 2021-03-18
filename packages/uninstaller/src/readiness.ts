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

import { select, delay, SelectEffect, CallEffect } from "redux-saga/effects";
import { CombinedState } from "redux";
import { State } from "./reducer";
import { K8sResource, PersistentVolume } from "@opstrace/kubernetes";
import { log, SECOND } from "@opstrace/utils";

export function* uninstallProgressReporter(): Generator<
  SelectEffect | CallEffect,
  void,
  CombinedState<State>
> {
  while (true) {
    const state: State = yield select();

    const {
      DaemonSets,
      Deployments,
      StatefulSets,
      PersistentVolumes
    } = state.kubernetes.cluster;

    const unprotectedDeployments = Deployments.resources.filter(
      d => !d.isProtected()
    );
    log.info(
      `waiting for ${
        unprotectedDeployments.length
      } Deployments: ${resourceNames(unprotectedDeployments)}`
    );
    log.info(
      `waiting for ${DaemonSets.resources.length} DaemonSets: ${resourceNames(
        DaemonSets.resources
      )}`
    );
    log.info(
      `waiting for ${
        StatefulSets.resources.length
      } StatefulSets: ${resourceNames(StatefulSets.resources)}`
    );
    log.info(
      `waiting for ${
        PersistentVolumes.resources.length
      } PersistentVolumes: ${resourceNames(PersistentVolumes.resources)}`
    );

    // Note(JP): that's an interesting exit criterion. Mhm.
    if (PersistentVolumes.resources.length === 0) {
      break;
    }

    yield delay(10 * SECOND);
  }
}

function resourceNames(resources: K8sResource[]): string {
  return resources
    .map(r => {
      if (r instanceof PersistentVolume) {
        // PVs aren't namespaced so don't display namespace
        // PV name is just a UUID, get the underlying PVC name from claimRef
        if (r.spec.spec == null || r.spec.spec.claimRef == null) {
          return `${r.name}:???`;
        } else {
          return `${r.name}:${r.spec.spec.claimRef.name}`;
        }
      } else {
        return `${r.namespace}/${r.name}`;
      }
    })
    .sort((a, b) => {
      if (a > b) {
        return 1;
      } else if (a < b) {
        return -1;
      } else {
        return 0;
      }
    })
    .join(", ");
}
