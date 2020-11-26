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

import { DeploymentType } from "../kinds";

export function getDeploymentRolloutMessage(d: DeploymentType): string {
  const deployment = d.spec!;
  const spec = d.spec!.spec!;
  const metadata = deployment.metadata!;
  const status = deployment.status!;

  const replicas = spec.replicas || 0;
  const updatedReplicas = status.updatedReplicas || 0;
  const availableReplicas = status.availableReplicas || 0;

  // Taken from https://github.com/kubernetes/kubectl/blob/0a26b53c373b22de64bf667dad7a2440359334d3/pkg/polymorphichelpers/rollout_status.go#L59

  if ((metadata.generation || 0) <= (status.observedGeneration || 0)) {
    // TODO: add case to handle progressDeadlineSeconds condition.
    if (updatedReplicas < replicas) {
      return `Waiting for Deployment ${d.namespace}/${d.name} rollout to finish: ${updatedReplicas} out of ${replicas} new replicas have been updated`;
    }
    if (replicas > updatedReplicas) {
      return `Waiting for Deployment ${d.namespace}/${
        d.name
      } rollout to finish: ${
        replicas - updatedReplicas
      } old replicas are pending termination`;
    }
    if (availableReplicas < updatedReplicas) {
      return `Waiting for Deployment ${d.namespace}/${d.name} rollout to finish: ${availableReplicas} of ${updatedReplicas} updated replicas are available`;
    }
    return "";
  }
  return `Waiting for Deployment spec update to be observed for ${d.namespace}/${d.name}`;
}
