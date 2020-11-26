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

import { DaemonSetType } from "../kinds";

export function getDaemonSetRolloutMessage(ds: DaemonSetType): string {
  const daemonset = ds.spec!;
  const spec = ds.spec!.spec!;
  const metadata = daemonset.metadata!;
  const status = daemonset.status!;

  const updatedNumberScheduled = status.updatedNumberScheduled || 0;
  const desiredNumberScheduled = status.desiredNumberScheduled || 0;
  const numberAvailable = status.numberAvailable || 0;

  // Taken from https://github.com/kubernetes/kubectl/blob/0a26b53c373b22de64bf667dad7a2440359334d3/pkg/polymorphichelpers/rollout_status.go#L95
  if (spec.updateStrategy && spec.updateStrategy.type !== "RollingUpdate") {
    return "";
  }
  if ((metadata.generation || 0) <= (status.observedGeneration || 0)) {
    if (updatedNumberScheduled < desiredNumberScheduled) {
      return `Waiting for DaemonSet ${ds.namespace}/${ds.name} rollout to finish: ${updatedNumberScheduled} out of ${desiredNumberScheduled} new pods have been updated`;
    }
    if (numberAvailable < desiredNumberScheduled) {
      return `Waiting for DaemonSet ${ds.namespace}/${ds.name} rollout to finish: ${numberAvailable} of ${desiredNumberScheduled} updated pods are available`;
    }
    return "";
  }
  return `Waiting for DaemonSet spec update to be observed for ${ds.namespace}/${ds.name}`;
}
