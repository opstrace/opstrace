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

import { KubeConfig } from "@kubernetes/client-node";

import { ResourceCollection } from "@opstrace/kubernetes";
import { State } from "../../reducer";

import { LokiAPIResources } from "./loki";
import { CortexAPIResources } from "./cortex";
import { DDAPIResources } from "./dd";

// This does not serve an API, right?
// Maybe we should move this out of resources/apis or rename resources/apis
import { SystemLogAgentResources } from "./systemlogs";

/* Translate node count into replica count*/
export function nodecountToReplicacount(nodecount: number) {
  const NC_RC_MAP: Record<string, number> = {
    "1": 1,
    "2": 2,
    "3": 2,
    "4": 3
  };

  const ncstring = nodecount.toFixed(0);
  if (ncstring in NC_RC_MAP) {
    return NC_RC_MAP[ncstring];
  }

  return Math.floor(nodecount / 2);
}

export function APIResources(
  state: State,
  kubeConfig: KubeConfig
): ResourceCollection {
  const collection = new ResourceCollection();

  state.tenants.list.tenants.forEach(tenant => {
    collection.add(SystemLogAgentResources(state, tenant, kubeConfig));
    collection.add(LokiAPIResources(state, tenant, kubeConfig));
    collection.add(CortexAPIResources(state, tenant, kubeConfig));
    collection.add(DDAPIResources(state, tenant, kubeConfig));
  });

  return collection;
}
