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

import { CombinedState } from "redux";
import {
  delay,
  select,
  call,
  CallEffect,
  SelectEffect
} from "redux-saga/effects";
import { State } from "../reducer";

import { SECOND, entries } from "@opstrace/utils";
import {
  reconcile,
  ResourceCollection,
  K8sResource,
  reduceCollection
} from "@opstrace/kubernetes";

import { KubeConfig } from "@kubernetes/client-node";

import { StorageResources } from "../resources/storage";
import { MemcacheResources } from "../resources/memcache";
import { LokiResources } from "../resources/loki";
import { MonitoringResources } from "../resources/monitoring";
import { APIResources } from "../resources/apis";
import { CortexResources } from "../resources/cortex";
import { IngressResources } from "../resources/ingress";
import { TenantResources } from "../resources/tenants";
import { OpstraceApplicationResources } from "../resources/app";

import { getControllerConfig } from "../helpers";

export function* reconciliationLoop(
  kubeConfig: KubeConfig
): Generator<CallEffect | SelectEffect, void, CombinedState<State>> {
  while (true) {
    yield delay(1 * SECOND);

    const state: State = yield select();
    const desired = new ResourceCollection();

    const actualCollection: K8sResource[] = [];

    entries(state.kubernetes.cluster).forEach(([, cache]) => {
      if (cache && cache.resources) {
        actualCollection.push(...(cache.resources as K8sResource[]));
      }
    });

    if (getControllerConfig(state).terminate) {
      yield call(reconcile, desired, reduceCollection(actualCollection));

      continue;
    }

    desired.add(StorageResources(state, kubeConfig));
    desired.add(MemcacheResources(state, kubeConfig, "loki"));
    desired.add(LokiResources(state, kubeConfig, "loki"));
    desired.add(MonitoringResources(state, kubeConfig, "monitoring"));
    desired.add(APIResources(state, kubeConfig));
    desired.add(MemcacheResources(state, kubeConfig, "cortex"));
    desired.add(CortexResources(state, kubeConfig, "cortex"));
    desired.add(IngressResources(state, kubeConfig, "ingress"));
    desired.add(OpstraceApplicationResources(state, kubeConfig, "application"));
    desired.add(TenantResources(state, kubeConfig));

    yield call(reconcile, desired, reduceCollection(actualCollection));
  }
}
