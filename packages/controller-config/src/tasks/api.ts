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

import { serialize, configmap, deserialize } from "../utils";

import { LatestControllerConfigType } from "../schema";

import {
  KubeConfiguration,
  ConfigMap,
  createOrUpdateConfigMapWithRetry
} from "@opstrace/kubernetes";
import { log } from "@opstrace/utils";

/**
 * Note(JP): what is the intended return type of this?
 *
 * Return deserialized configmap or `undefined` if the config map cannot
 * be found.
 */
export async function fetch(
  kubeConfig: KubeConfiguration
): Promise<LatestControllerConfigType | undefined> {
  log.info("fetch Opstrace controller config map from Kubernetes cluster");

  const cm = configmap(kubeConfig);
  try {
    const v1ConfigMap = await cm.read();
    log.debug("got config map body from k8s cluster: %s", v1ConfigMap.body);
    return deserialize(new ConfigMap(v1ConfigMap.body, kubeConfig));
  } catch (e) {
    if (e.response) {
      if (e.response.body.code.toString().startsWith("4")) {
        log.info(
          "cannot get controller config: code %s, message: %s",
          e.response.body.code,
          e.response.body.message
        );
        return undefined;
      }
    }

    throw e;
  }
}

export async function set(
  controllerconfig: LatestControllerConfigType,
  kubeConfig: KubeConfiguration
): Promise<void> {
  const cm = serialize(controllerconfig, kubeConfig);

  // Expect this error structure:
  // "response": {
  //   "statusCode": 404,
  //   "body": {
  //     "kind": "Status",
  //     "apiVersion": "v1",
  //     "metadata": {},
  //     "status": "Failure",
  //     "message": "configmaps \"opstrace-controller-config\" not found",
  //     "reason": "NotFound",
  //     "details": {
  //       "name": "opstrace-controller-config",
  //       "kind": "configmaps"
  //     },
  //     "code": 404
  //   },
  //...

  await createOrUpdateConfigMapWithRetry(cm);
}
