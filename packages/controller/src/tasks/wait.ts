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

import { select, delay } from "redux-saga/effects";
import { State } from "../reducer";
import { SECOND, log } from "@opstrace/utils";

export function* blockUntilCacheHydrated() {
  while (true) {
    const { kubernetes }: State = yield select();
    const {
      Nodes,
      Namespaces,
      ApiServices,
      ClusterRoles,
      ClusterRoleBindings,
      ConfigMaps,
      CustomResourceDefinitions,
      DaemonSets,
      Deployments,
      Roles,
      RoleBindings,
      Secrets,
      Services,
      ServiceAccounts,
      StatefulSets,
      StorageClasses,
      PersistentVolumeClaims,
      Ingresses
    } = kubernetes.cluster;

    if (
      Nodes.loaded &&
      Namespaces.loaded &&
      ApiServices.loaded &&
      ClusterRoles.loaded &&
      ClusterRoleBindings.loaded &&
      ConfigMaps.loaded &&
      CustomResourceDefinitions.loaded &&
      DaemonSets.loaded &&
      Deployments.loaded &&
      Roles.loaded &&
      RoleBindings.loaded &&
      Secrets.loaded &&
      Services.loaded &&
      ServiceAccounts.loaded &&
      StatefulSets.loaded &&
      StorageClasses.loaded &&
      PersistentVolumeClaims.loaded &&
      Ingresses.loaded
    ) {
      log.info(`Kubernetes cache is hydrated`);
      break;
    }
    log.info(`Waiting for the Kubernetes cache to hydrate...`);
    yield delay(1 * SECOND);
  }
}
