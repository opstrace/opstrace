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
import { put, take, cancelled } from "redux-saga/effects";
import * as k8s from "@opstrace/kubernetes";
import { KubeConfig } from "@kubernetes/client-node";
import { log } from "@opstrace/utils";

export function* runInformers(kubeConfig: KubeConfig) {
  log.info(`Starting informers`);

  const clusterChannel = eventChannel(channel => {
    const unsubscribes = [
      k8s.Node.startInformer(kubeConfig, channel),
      k8s.Namespace.startInformer(kubeConfig, channel),
      k8s.ApiService.startInformer(kubeConfig, channel),
      k8s.ClusterRole.startInformer(kubeConfig, channel),
      k8s.ClusterRoleBinding.startInformer(kubeConfig, channel),
      k8s.ConfigMap.startInformer(kubeConfig, channel),
      k8s.CustomResourceDefinition.startInformer(kubeConfig, channel),
      k8s.DaemonSet.startInformer(kubeConfig, channel),
      k8s.Deployment.startInformer(kubeConfig, channel),
      k8s.Role.startInformer(kubeConfig, channel),
      k8s.RoleBinding.startInformer(kubeConfig, channel),
      k8s.Secret.startInformer(kubeConfig, channel),
      k8s.Service.startInformer(kubeConfig, channel),
      k8s.ServiceAccount.startInformer(kubeConfig, channel),
      k8s.StatefulSet.startInformer(kubeConfig, channel),
      k8s.StatefulSet.startInformer(kubeConfig, channel),
      k8s.StorageClass.startInformer(kubeConfig, channel),
      k8s.PersistentVolume.startInformer(kubeConfig, channel),
      k8s.PersistentVolumeClaim.startInformer(kubeConfig, channel),
      k8s.Ingress.startInformer(kubeConfig, channel),
      k8s.V1AlertmanagerResource.startInformer(kubeConfig, channel),
      k8s.V1PodmonitorResource.startInformer(kubeConfig, channel),
      k8s.V1PrometheusResource.startInformer(kubeConfig, channel),
      k8s.V1PrometheusruleResource.startInformer(kubeConfig, channel),
      k8s.V1ServicemonitorResource.startInformer(kubeConfig, channel),
      k8s.V1CertificateResource.startInformer(kubeConfig, channel),
      k8s.V1ClusterissuerResource.startInformer(kubeConfig, channel),
      k8s.V1IssuerResource.startInformer(kubeConfig, channel)
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
      // when the controller is running slow, it can be because of too many events
      // this helps to see them.
      // TODO METRIC: add metric for keeping track of this
      log.debug(event.type);
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
