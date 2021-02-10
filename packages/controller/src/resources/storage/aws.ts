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

import { ResourceCollection, StorageClass } from "@opstrace/kubernetes";
import { State } from "../../reducer";
import { KubeConfig } from "@kubernetes/client-node";

export function StorageResources(
  state: State,
  kubeConfig: KubeConfig
): ResourceCollection {
  const collection = new ResourceCollection();

  collection.add(
    new StorageClass(
      {
        apiVersion: "storage.k8s.io/v1",
        kind: "StorageClass",
        metadata: {
          name: "pd-ssd"
        },
        parameters: {
          type: "gp2"
        },
        provisioner: "kubernetes.io/aws-ebs",
        volumeBindingMode: "WaitForFirstConsumer",
        allowVolumeExpansion: true
      },
      kubeConfig
    )
  );

  return collection;
}
