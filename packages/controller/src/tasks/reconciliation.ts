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
import {
  DockerHubResources,
  memoizeImagePullSecrets
} from "@opstrace/controller-config";

import { KubeConfig } from "@kubernetes/client-node";

import { APIResources } from "../resources/apis";
import { ApplicationResources } from "../resources/app";
import { CortexResources } from "../resources/cortex";
import { IngressResources } from "../resources/ingress";
import { IntegrationResources } from "../resources/integrations";
import { LokiResources } from "../resources/loki";
import { MemcacheResources } from "../resources/memcache";
import { MonitoringResources } from "../resources/monitoring";
import { RedisResources } from "../resources/redis";
import { StorageResources } from "../resources/storage";
import { TenantResources } from "../resources/tenants";

import { getControllerConfig } from "../helpers";
import { setToReady } from "./kubernetesReadinessProbe";
import { CortexOperatorResources } from "../resources/cortex-operator";

export function* reconciliationLoop(
  kubeConfig: KubeConfig
): Generator<CallEffect | SelectEffect, void, CombinedState<State>> {
  while (true) {
    yield delay(1 * SECOND);

    const state: State = yield select();
    // Set memoized image pull secrets for all podspecs
    memoizeImagePullSecrets(state.kubernetes.cluster.Secrets.resources);

    const desired = new ResourceCollection();

    const actualCollection: K8sResource[] = [];

    entries(state.kubernetes.cluster).forEach(([, cache]) => {
      if (cache && cache.resources) {
        actualCollection.push(...(cache.resources as K8sResource[]));
      }
    });

    if (getControllerConfig(state).terminate) {
      yield call(reconcile, desired, reduceCollection(actualCollection), true);

      // The controller has been instructed to shut down, set the readiness
      // probe to ready to mark the kubernetes deployment as ready.
      setToReady();
      continue;
    }

    desired.add(
      DockerHubResources(
        state.kubernetes.cluster.Secrets.resources,
        state.kubernetes.cluster.Namespaces.resources,
        kubeConfig
      )
    );
    desired.add(StorageResources(state, kubeConfig));
    desired.add(MemcacheResources(state, kubeConfig, "loki"));
    desired.add(LokiResources(state, kubeConfig, "loki"));
    desired.add(MonitoringResources(state, kubeConfig, "monitoring"));
    desired.add(APIResources(state, kubeConfig));
    desired.add(CortexResources(state, kubeConfig, "cortex"));
    desired.add(IngressResources(state, kubeConfig, "ingress"));
    desired.add(
      ApplicationResources(
        state,
        kubeConfig,
        "application",
        "ingress",
        "https-cert"
      )
    );
    desired.add(RedisResources(state, kubeConfig, "application"));
    desired.add(TenantResources(state, kubeConfig, "ingress", "https-cert"));
    desired.add(IntegrationResources(state, kubeConfig));
    desired.add(
      CortexOperatorResources(state, kubeConfig, "cortex-operator-system")
    );

    yield call(reconcile, desired, reduceCollection(actualCollection), false);

    // Set the controller as ready after running the reconcile loop. At this
    // point the deployments/statefulsets etc have been reconciled and the pod
    // rollouts will start. We mark the controller ready now to signal to the
    // CLI (install and upgrade commands) that the reconcile loop ran and they
    // should now wait for the deployments to finish the rollout.
    setToReady();
  }
}
