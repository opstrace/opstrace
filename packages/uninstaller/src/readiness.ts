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

    const unProtectedDeployments = Deployments.resources.filter(
      d => !d.isProtected()
    );
    log.info(`waiting for ${unProtectedDeployments.length} Deployments`);
    log.info(`waiting for ${DaemonSets.resources.length} DaemonSets`);
    log.info(`waiting for ${StatefulSets.resources.length} StatefulSets`);
    log.info(
      `waiting for ${PersistentVolumes.resources.length} PersistentVolumes`
    );

    // Note(JP): that's an interesting exit criterion. Mhm.
    if (PersistentVolumes.resources.length === 0) {
      break;
    }

    yield delay(10 * SECOND);
  }
}
