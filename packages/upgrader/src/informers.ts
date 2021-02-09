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

import { eventChannel } from "redux-saga";
import { CombinedState } from "redux";

import {
  put,
  take,
  cancelled,
  select,
  delay,
  ChannelTakeEffect,
  PutEffect,
  CancelledEffect,
  CallEffect,
  SelectEffect
} from "redux-saga/effects";
import * as k8s from "@opstrace/kubernetes";
import { KubeConfig } from "@kubernetes/client-node";
import { log, SECOND } from "@opstrace/utils";
import { State } from "./reducer";
import { Action } from "redux";

export function* runInformers(
  kubeConfig: KubeConfig
): Generator<
  ChannelTakeEffect<void | unknown> | PutEffect | CancelledEffect,
  void,
  Action
> {
  log.info(`Starting informers`);

  const clusterChannel = eventChannel(channel => {
    const unsubscribes = [
      k8s.DaemonSet.startInformer(kubeConfig, channel),
      k8s.Deployment.startInformer(kubeConfig, channel),
      k8s.PersistentVolume.startInformer(kubeConfig, channel),
      k8s.StatefulSet.startInformer(kubeConfig, channel),
      k8s.StatefulSet.startInformer(kubeConfig, channel)
    ];

    // return the unsubscribe function for eventChannel. This will be called when the channel
    // is closed.
    return () => {
      log.info(`Closing clusterChannel and shutting down informers`);
      unsubscribes.forEach(fn => fn());
    };
  });
  try {
    while (true) {
      const event = yield take(clusterChannel);
      yield put(event);
    }
  } catch (e) {
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
    const {
      DaemonSets,
      Deployments,
      PersistentVolumes,
      StatefulSets
    } = kubernetes.cluster;

    if (
      DaemonSets.loaded &&
      Deployments.loaded &&
      PersistentVolumes.loaded &&
      StatefulSets.loaded
    ) {
      log.info(`kubernetes cache is hydrated`);
      break;
    }
    log.info(`waiting for the kubernetes cache to hydrate...`);
    yield delay(1 * SECOND);
  }
}
