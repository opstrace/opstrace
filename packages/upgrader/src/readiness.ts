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

import { select, delay } from "redux-saga/effects";

import { log, SECOND } from "@opstrace/utils";
import {
  activeDaemonsets,
  activeDeployments,
  activeStatefulsets,
  activeCertificates
} from "@opstrace/kubernetes";
import { CONTROLLER_NAME } from "@opstrace/controller-config";

import { State } from "./reducer";

//eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function* waitForControllerDeployment() {
  // Exit if controller deployment does not exist.
  const state: State = yield select();
  const { Deployments } = state.kubernetes.cluster;
  const cd = Deployments.resources.find(d => d.name === CONTROLLER_NAME);
  if (cd === undefined) {
    throw new Error("controller deployment not found");
  }

  log.info("controller deployment found in informer-based state");

  // follow controller deployment. .spec / .resources has the `status` property
  // which may look like this:

  //    "status": {
  //      "observedGeneration": 1,
  //      "replicas": 1,
  //      "updatedReplicas": 1,
  //      "readyReplicas": 1,
  //      "availableReplicas": 1,
  //      "conditions": [
  //        {
  //          "type": "Available",
  //          "status": "True",
  //          "lastUpdateTime": "2020-11-20T00:22:04Z",
  //          "lastTransitionTime": "2020-11-20T00:22:04Z",
  //          "reason": "MinimumReplicasAvailable",
  //          "message": "Deployment has minimum availability."
  //        },
  //        {
  //          "type": "Progressing",
  //          "status": "True",
  //          "lastUpdateTime": "2020-11-20T00:22:04Z",
  //          "lastTransitionTime": "2020-11-20T00:21:37Z",
  //          "reason": "NewReplicaSetAvailable",
  //          "message": "ReplicaSet \"opstrace-controller-6775677449\" has successfully progressed."
  //        }
  //      ]
  //    }
  //  },

  const previousGeneration = cd.spec.status!.observedGeneration!;

  while (true) {
    const state: State = yield select();
    const { Deployments } = state.kubernetes.cluster;
    const cd = Deployments.resources.find(d => d.name === CONTROLLER_NAME);

    if (cd === undefined) {
      log.debug("`cd` is undefined: should not happen in this loop");
      yield delay(5000);
      continue;
    }

    if (cd.spec.status === undefined) {
      log.info("controller deployment: no status yet, wait");
      yield delay(3000);
      continue;
    }

    // debug-log the entire structure
    log.debug(
      "controller deployment status: %s",
      JSON.stringify(cd.spec.status, null, 2)
    );

    if (cd.spec.status.conditions === undefined) {
      log.info("controller deployment: no condition updates yet, wait");
      yield delay(3000);
      continue;
    }

    if (cd.spec.status!.observedGeneration! === previousGeneration) {
      log.debug("controller deployment as not started the rollout");
      yield delay(3000);
      continue;
    }

    // example:
    // [
    //   {
    //     "type": "Available",
    //     "status": "False",
    //     "lastUpdateTime": "2020-11-20T17:18:08Z",
    //     "lastTransitionTime": "2020-11-20T17:18:08Z",
    //     "reason": "MinimumReplicasUnavailable",
    //     "message": "Deployment does not have minimum availability."
    //   },
    //   {
    //     "type": "Progressing",
    //     "status": "True",
    //     "lastUpdateTime": "2020-11-20T17:18:09Z",
    //     "lastTransitionTime": "2020-11-20T17:18:08Z",
    //     "reason": "ReplicaSetUpdated",
    //     "message": "ReplicaSet \"opstrace-controller-5584b7996f\" is progressing."
    //   }
    // ]

    for (const cond of cd.spec.status.conditions) {
      log.info(
        `controller deployment: ${cond.type}: ${cond.status} (${cond.message})`
      );
    }

    log.info(
      "controller deployment: replicas: %s, of which are READY: %s",
      cd.spec.status?.replicas,
      cd.spec.status?.readyReplicas || 0
    );

    const rr = cd.spec.status?.readyReplicas;

    if (rr !== undefined && rr >= 1) {
      log.info(
        "at least one replica is READY: desired state reached, continue"
      );
      break;
    }
    yield delay(15000);
  }
}

//eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function* upgradeProgressReporter() {
  while (true) {
    const state: State = yield select();

    const {
      DaemonSets,
      Deployments,
      StatefulSets,
      Certificates
    } = state.kubernetes.cluster;

    // Check DaemonSets
    const activeDaemonSets = activeDaemonsets(DaemonSets.resources);

    // Check Deployments
    const activeDeploys = activeDeployments(Deployments.resources);

    // Check StatefulSets
    const activeStatefulSets = activeStatefulsets(StatefulSets.resources);

    const activeCerts = activeCertificates(Certificates.resources);

    log.info(`waiting for ${activeDeploys.length} Deployments`);
    if (activeDeploys.length < 3) {
      // for the last few: show the names.
      for (const d of activeDeploys) {
        log.debug("    %s", d);
      }
    }

    log.info(`waiting for ${activeDaemonSets.length} DaemonSets`);
    if (activeDaemonSets.length < 3) {
      // for the last few: show the names.
      for (const d of activeDaemonSets) {
        log.debug("    %s", d);
      }
    }

    log.info(`waiting for ${activeStatefulSets.length} StatefulSets`);
    if (activeStatefulSets.length < 3) {
      // for the last few: show the names.
      for (const s of activeStatefulSets) {
        log.debug("    %s", s);
      }
    }

    log.info(`waiting for ${activeCerts.length} Certificates`);
    if (activeCerts.length < 3) {
      // for the last few: show the names.
      for (const c of activeCerts) {
        log.debug("    %s", c);
      }
    }

    if (
      activeDeploys.length +
        activeDaemonSets.length +
        activeStatefulSets.length +
        activeCerts.length ===
      0
    ) {
      break;
    }

    yield delay(5 * SECOND);
  }
}
