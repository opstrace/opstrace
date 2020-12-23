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

import { strict as assert } from "assert";
import { StatefulSetType } from "../kinds";

export function getStatefulSetRolloutMessage(s: StatefulSetType): string {
  const statefulSet = s.spec;
  const spec = s.spec.spec;
  const metadata = statefulSet.metadata;
  const status = statefulSet.status;

  assert(spec);
  assert(metadata);
  assert(status);

  const replicas = spec.replicas || 0;
  const updatedReplicas = status.updatedReplicas || 0;
  const readyReplicas = status.readyReplicas || 0;

  // Taken from https://github.com/kubernetes/kubectl/blob/0a26b53c373b22de64bf667dad7a2440359334d3/pkg/polymorphichelpers/rollout_status.go#L120

  if (spec.updateStrategy && spec.updateStrategy.type !== "RollingUpdate") {
    return "";
  }
  if (
    status.observedGeneration == 0 ||
    (metadata.generation || 0) > (status.observedGeneration || 0)
  ) {
    return `Waiting for StatefulSet spec update to be observed for ${s.namespace}/${s.name}`;
  }
  if (replicas && readyReplicas < replicas) {
    return `Waiting for ${
      replicas - readyReplicas
    } pods to be ready for StatefulSet ${s.namespace}/${s.name}`;
  }
  if (
    spec.updateStrategy &&
    spec.updateStrategy.type !== "RollingUpdate" &&
    spec.updateStrategy.rollingUpdate
  ) {
    if (replicas && spec.updateStrategy.rollingUpdate.partition) {
      if (
        updatedReplicas <
        replicas - spec.updateStrategy.rollingUpdate.partition
      ) {
        return `Waiting for partitioned roll out to finish for StatefulSet: ${updatedReplicas} out of ${
          replicas - spec.updateStrategy.rollingUpdate.partition
        } new pods have been updated for ${s.namespace}/${s.name}`;
      }
    }
    return "";
  }
  if (status.updateRevision != status.currentRevision) {
    return `waiting for StatefulSet rolling update to complete ${updatedReplicas} pods at revision ${status.updateRevision} for ${s.namespace}/${s.name}`;
  }
  return "";
}
