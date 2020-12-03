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

import { call, select } from "redux-saga/effects";
import {
  RunningReporterChangeEvent,
  DestroyingReporterChangeEvent,
  DestroyingReporterResourceInputs,
  RunningReporterResourceInputs,
  reporter
} from "@opstrace/kubernetes";

import { getControllerConfig } from "../helpers";
import { State } from "../reducer";
import { log } from "@opstrace/utils";

function* getRunningReporterResources() {
  return yield call(function* () {
    const state: State = yield select();
    const {
      DaemonSets,
      Deployments,
      StatefulSets,
      Certificates
    } = state.kubernetes.cluster;

    const resources: RunningReporterResourceInputs = {
      DaemonSets: DaemonSets.resources,
      Deployments: Deployments.resources,
      StatefulSets: StatefulSets.resources,
      Certificates: Certificates.resources
    };

    return resources;
  });
}

let activeDeployments = -1;
let activeDaemonSets = -1;
let activeStatefulSets = -1;
let activeCertificates = -1;

function* handleRunningReporterChange(e: RunningReporterChangeEvent) {
  return yield call(function () {
    //const state: State = yield select();
    //const { name } = getControllerConfig(state);

    if (
      activeDeployments === -1 ||
      activeDeployments !== e.activeDeployments.length
    ) {
      log.info(`Waiting for ${e.activeDeployments.length} active Deployments`);
      activeDeployments = e.activeDeployments.length;
    }
    if (
      activeDaemonSets === -1 ||
      activeDaemonSets !== e.activeDaemonSets.length
    ) {
      log.info(`Waiting for ${e.activeDaemonSets.length} active DaemonSets`);
      activeDaemonSets = e.activeDaemonSets.length;
    }
    if (
      activeStatefulSets === -1 ||
      activeStatefulSets !== e.activeStatefulSets.length
    ) {
      log.info(
        `Waiting for ${e.activeStatefulSets.length} active StatefulSets`
      );
      activeStatefulSets = e.activeStatefulSets.length;
    }
    if (
      activeCertificates === -1 ||
      activeCertificates !== e.activeCertificates.length
    ) {
      log.info(
        `Waiting for ${e.activeCertificates.length} active Certificates`
      );
      activeCertificates = e.activeCertificates.length;
    }
    // yield call(patch, name, {
    //   heartbeat: Date.now(),
    //   controllerReady: e.ready
    // });
  });
}

function* getDestroyingReporterResources() {
  return yield call(function* () {
    const state: State = yield select();
    const { PersistentVolumes } = state.kubernetes.cluster;

    const resources: DestroyingReporterResourceInputs = {
      PersistentVolumes: PersistentVolumes.resources
    };

    return resources;
  });
}

function* handleDestroyingReporterChange(e: DestroyingReporterChangeEvent) {
  return yield call(function* () {
    //const state: State = yield select();
    //const { name, controllerTerminated } = getControllerConfig(state);

    log.info(
      `Waiting for ${e.remainingPersistentVolumes.length} PersistentVolumes to be released`
    );
    // Update status only if we haven't already terminated
    // This will ensure we don't write a patch unnecessarily (or in the worst case, when we've accidentally left
    // the controller running locally after we've run `make stack-destroy` and destroyed the stack already)
    // if (!controllerTerminated) {
    //   yield call(patch, name, {
    //     heartbeat: Date.now(),
    //     controllerTerminated: e.ready
    //   });
    // }
  });
}

function* shouldDestroy() {
  return yield call(function* () {
    const state: State = yield select();
    return getControllerConfig(state).terminate;
  });
}

export function* runReporter(): IterableIterator<unknown> {
  return yield call(
    reporter,
    {
      getResourceInputs: getRunningReporterResources,
      onChange: handleRunningReporterChange
    },
    {
      getResourceInputs: getDestroyingReporterResources,
      onChange: handleDestroyingReporterChange
    },
    shouldDestroy
  );
}
