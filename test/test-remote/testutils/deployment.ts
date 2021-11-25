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

import { KubeConfig } from "@kubernetes/client-node";

import {
  activeDaemonsets,
  activeDeployments,
  activeStatefulsets,
  isDaemonSet,
  isDeployment,
  isStatefulSet,
  kubernetesError,
  K8sResource,
  DaemonSet,
  Deployment,
  StatefulSet,
  daemonSetsReducer,
  deploymentsReducer,
  statefulSetsReducer
} from "@opstrace/kubernetes";

import {
  fork,
  call,
  race,
  cancel,
  put,
  take,
  cancelled,
  select,
  delay,
  CancelledEffect,
  CallEffect,
  ChannelTakeEffect,
  Effect,
  PutEffect,
  SelectEffect
} from "redux-saga/effects";
import createSagaMiddleware from "redux-saga";
import { eventChannel } from "redux-saga";
import {
  Action,
  CombinedState,
  applyMiddleware,
  combineReducers,
  createStore
} from "redux";

import { log } from "./index";

// Creates or updates the provided resources.
// This does NOT wait for creation/update to complete, see waitForAllReady.
export async function deployAll(resources: K8sResource[]) {
  for (const r of resources) {
    try {
      log.info(`Try to create ${r.constructor.name}: ${r.namespace}/${r.name}`);
      await r.create();
    } catch (e: any) {
      const err = kubernetesError(e);
      if (err.statusCode === 409) {
        // If we're re-running the test against a cluster, ensure things like job labels are updated.
        log.info("Already exists, doing an update");
        try {
          await r.update();
        } catch (e2: any) {
          const err2 = kubernetesError(e2);
          log.error(`update failed with error: ${err2.message}`);
          throw e2;
        }
      } else {
        log.error(`create failed with error: ${err.message}`);
        throw e;
      }
    }
  }
}

// Deletes the provided resources.
// This does NOT wait for teardown to complete.
export async function deleteAll(resources: K8sResource[]) {
  for (const r of resources) {
    try {
      log.info(`Try to delete ${r.constructor.name}: ${r.namespace}/${r.name}`);
      await r.delete();
    } catch (e: any) {
      const err = kubernetesError(e);
      if (err.statusCode === 404) {
        log.info("already doesn't exist");
      } else {
        throw e;
      }
    }
  }
}

// Waits for all Deployments/DaemonSets/StatefulSets in the provided list to be Running/Ready.
// This may be called after deployAll.
// Note that the specified K8sResources will not be updated.
export async function waitForAllReady(
  kubeConfig: KubeConfig,
  resources: K8sResource[],
  // If there is a flake with pulling a container image, the pull timeout is 5 minutes.
  // Give a couple minutes margin to allow for flakes and for the pods to become ready.
  maxWaitSeconds = 7 * 60
) {
  // The provided resources may contain ConfigMaps/etc.
  // Don't worry about those, just focus on the three types that involve deploying pods.
  const daemonSets = resources
    .filter(r => isDaemonSet(r))
    .map(r => r as DaemonSet);
  const deployments = resources
    .filter(r => isDeployment(r))
    .map(r => r as Deployment);
  const statefulSets = resources
    .filter(r => isStatefulSet(r))
    .map(r => r as StatefulSet);

  const sm = createSagaMiddleware({
    onError: function (e: Error, detail: any) {
      log.error("error seen by saga middleware:\n%s", e.stack);
      if (detail && detail.sagaStack !== undefined) {
        log.error("saga stack: %s", detail.sagaStack);
      }
      throw Error("exiting after saga error");
    }
  });
  createStore(rootReducer, applyMiddleware(sm));
  await sm
    .run(function* () {
      yield waitForAllReadyImpl(
        kubeConfig,
        daemonSets,
        deployments,
        statefulSets,
        maxWaitSeconds
      );
    })
    .toPromise();
}

function* waitForAllReadyImpl(
  kubeConfig: KubeConfig,
  daemonSets: DaemonSet[],
  deployments: Deployment[],
  statefulSets: StatefulSet[],
  maxWaitSeconds: number
) {
  //@ts-ignore: TS7075 generator lacks return type (TS 4.3)
  const informers = yield fork(runInformers, kubeConfig);

  yield call(blockUntilCacheHydrated);

  const { timeout } = yield race({
    upgrade: call(waitForReady, {
      originalDaemonSets: daemonSets,
      originalDeployments: deployments,
      originalStatefulSets: statefulSets
    }),
    timeout: delay(maxWaitSeconds * 1000)
  });

  yield cancel(informers);
  if (timeout) {
    throw Error(
      `Timed out waiting for resources to be ready after ${maxWaitSeconds}s`
    );
  }
}

const rootReducers = {
  kubernetes: combineReducers({
    cluster: combineReducers({
      DaemonSets: daemonSetsReducer,
      Deployments: deploymentsReducer,
      StatefulSets: statefulSetsReducer
    })
  })
};
const rootReducer = combineReducers(rootReducers);
type State = ReturnType<typeof rootReducer>;

export function* runInformers(
  kubeConfig: KubeConfig
): Generator<
  ChannelTakeEffect<void | unknown> | PutEffect | CancelledEffect,
  void,
  Action
> {
  log.info(`Starting pod informers`);

  const clusterChannel = eventChannel(channel => {
    const unsubscribes = [
      DaemonSet.startInformer(kubeConfig, channel),
      Deployment.startInformer(kubeConfig, channel),
      StatefulSet.startInformer(kubeConfig, channel)
    ];

    // return the unsubscribe function for eventChannel. This will be called when the channel
    // is closed.
    return () => {
      log.info(`Closing clusterChannel and shutting down pod informers`);
      unsubscribes.forEach(fn => fn());
    };
  });

  try {
    while (true) {
      const event = yield take(clusterChannel);
      yield put(event);
    }
  } catch (e: any) {
    log.error(e);
  } finally {
    // If task cancelled, close the channel, unsubscribing the informers
    if (yield cancelled()) {
      clusterChannel.close();
    }
  }
}

export function* blockUntilCacheHydrated(): Generator<
  SelectEffect | CallEffect,
  void,
  CombinedState<State>
> {
  while (true) {
    const { kubernetes }: State = yield select();
    const { DaemonSets, Deployments, StatefulSets } = kubernetes.cluster;

    if (DaemonSets.loaded && Deployments.loaded && StatefulSets.loaded) {
      log.info(`kubernetes cache is hydrated`);
      break;
    }
    log.info(`waiting for the kubernetes cache to hydrate...`);
    yield delay(3000);
  }
}

//eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function* waitForReady(config: {
  originalDaemonSets: DaemonSet[];
  originalDeployments: Deployment[];
  originalStatefulSets: StatefulSet[];
}): Generator<Effect, void, State> {
  while (true) {
    const state: State = yield select();
    const { DaemonSets, Deployments, StatefulSets } = state.kubernetes.cluster;
    const matchingDaemonSets = config.originalDaemonSets.map(o =>
      getMatch(o, DaemonSets.resources)
    );
    const matchingDeployments = config.originalDeployments.map(o =>
      getMatch(o, Deployments.resources)
    );
    const matchingStatefulSets = config.originalStatefulSets.map(o =>
      getMatch(o, StatefulSets.resources)
    );

    // Check if any of the items are "active" (still deploying), log the resulting messages if so
    const activeMessages = activeDaemonsets(matchingDaemonSets)
      .concat(activeDeployments(matchingDeployments))
      .concat(activeStatefulsets(matchingStatefulSets));
    if (activeMessages.length == 0) {
      log.info(`All pod resources are Ready, exiting wait`);
      break;
    }

    log.info(
      `Waiting on ${
        activeMessages.length
      } active pod resources:\n- ${activeMessages.join("\n- ")}`
    );
    yield delay(7000);
  }
}

function getMatch<T extends K8sResource>(needle: T, haystack: T[]): T {
  for (const h of haystack) {
    if (h.namespace === needle.namespace && h.name === needle.name) {
      return h;
    }
  }
  // Implies that the resource was deleted underneath us while we were waiting on it
  throw Error(
    `Missing ${needle.kind} resource: ${needle.namespace}/${needle.name}`
  );
}
