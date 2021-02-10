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

import { ResourceCollection } from "@opstrace/kubernetes";
import { State } from "../../reducer";
import { getControllerConfig } from "../../helpers";
import { KubeConfig } from "@kubernetes/client-node";
import { StorageResources as GCPStorageResources } from "./gcp";
import { StorageResources as AWSStorageResources } from "./aws";

export function StorageResources(
  state: State,
  kubeConfig: KubeConfig
): ResourceCollection {
  const collection = new ResourceCollection();
  const { target } = getControllerConfig(state);
  if (target === "gcp") {
    collection.add(GCPStorageResources(state, kubeConfig));
  }
  if (target === "aws") {
    collection.add(AWSStorageResources(state, kubeConfig));
  }

  return collection;
}
