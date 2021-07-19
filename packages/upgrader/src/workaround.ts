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

import { SECOND } from "@opstrace/utils";
import { select, call, all, delay, Effect } from "redux-saga/effects";
import { upgradeProgressReporter } from "./readiness";
import { State } from "./reducer";

export function* workaroundRestartLokiDistributors(): Generator<
  Effect,
  void,
  State
> {
  const state: State = yield select();
  const { Deployments } = state.kubernetes.cluster;

  const cd = Deployments.resources.filter(
    d => d.name === "distributor" && d.namespace === "loki"
  );
  if (cd === undefined) {
    throw new Error("loki distributor deployment not found");
  }

  // Delete the deployment and wait for the controller to recreate it.
  yield all(cd.map(d => d.delete()));
  yield delay(10 * SECOND);
  yield call(upgradeProgressReporter);
}
