/**
 * Copyright 2019-2021 Opstrace, Inc.
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
import { put, take, cancelled } from "redux-saga/effects";
import * as k8s from "@opstrace/kubernetes";
import { KubeConfig } from "@kubernetes/client-node";
import { log, debugLogErrorDetail } from "@opstrace/utils";

//eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function* runInformers(kubeConfig: KubeConfig) {
  log.info("starting informers");

  const clusterChannel = eventChannel(channel => {
    const unsubscribes = [
      k8s.ConfigMap.startInformer(kubeConfig, channel),
      k8s.DaemonSet.startInformer(kubeConfig, channel),
      k8s.Deployment.startInformer(kubeConfig, channel),
      k8s.Secret.startInformer(kubeConfig, channel),
      k8s.StatefulSet.startInformer(kubeConfig, channel),
      k8s.V1CertificateResource.startInformer(kubeConfig, channel)
    ];

    // return the unsubscribe function for eventChannel. This will be called
    // when the channel is closed.
    return () => {
      log.info("shutting down k8s informers");
      unsubscribes.forEach(fn => fn());
    };
  });

  while (true) {
    let event;
    try {
      event = yield take(clusterChannel);
    } catch (err) {
      log.warning("error during `event = yield take(clusterChannel)`: %s", err);
      debugLogErrorDetail(err);
    }
    if (event !== undefined) {
      try {
        yield put(event);
      } catch (err) {
        log.warning("error during `yield put(event)`: %s", err);
        debugLogErrorDetail(err);
      }
    }
    if (yield cancelled()) {
      log.info(
        "informer loop got signal: cancelled -- close cluster channels, end loop"
      );
      clusterChannel.close();
      break;
    }
  }
}
