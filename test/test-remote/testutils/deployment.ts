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

import {
  activeDaemonsets,
  activeDeployments,
  activeStatefulsets,
  isDaemonSet,
  isDeployment,
  isStatefulSet,
  K8sResource,
  DaemonSet,
  Deployment,
  StatefulSet
} from "@opstrace/kubernetes";

import { log, waitForQueryResult } from "./index";

// Waits for all Deployments/DaemonSets/StatefulSets in the provided list to be Running (and Ready)
export async function waitForAllReady(
  resources: K8sResource[],
  // If there is a flake with pulling a container image, the timeout is 5 minutes.
  // Give a couple minutes margin to allow for flakes and for the pods to become ready.
  maxWaitSeconds = 7 * 60
) {
  const daemonSets = resources.filter(r => isDaemonSet(r)).map(r => r as DaemonSet);
  const deployments = resources.filter(r => isDeployment(r)).map(r => r as Deployment);
  const statefulSets = resources.filter(r => isStatefulSet(r)).map(r => r as StatefulSet);
  await waitForQueryResult(
    () => Promise.resolve(null),
    _data => {
      const activeMessages = activeDaemonsets(daemonSets)
        .concat(activeDeployments(deployments))
        .concat(activeStatefulsets(statefulSets));
      if (activeMessages.length == 0) {
        log.info(`All resources are Ready, exiting wait`);
        return true;
      } else {
        log.info(`Waiting on ${activeMessages.length} active resources:\n- ${activeMessages.join("\n- ")}`);
        return null;
      }
    },
    maxWaitSeconds,
    false // Nothing to log - resource status updates are handled behind the scenes
  );
}
