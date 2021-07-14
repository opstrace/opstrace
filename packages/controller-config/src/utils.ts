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

import { ConfigMap, KubeConfiguration } from "@opstrace/kubernetes";
import {
  LatestControllerConfigType,
  LatestControllerConfigSchema
} from "./schema";

export const CONFIGMAP_NAME = "opstrace-controller-config";
export const STORAGE_KEY = "config.json";

export const isConfigStorage = (configMap: ConfigMap): boolean =>
  configMap.name === CONFIGMAP_NAME;

export const deserialize = (
  configMap: ConfigMap
): LatestControllerConfigType => {
  return LatestControllerConfigSchema.cast(
    JSON.parse(configMap.spec.data?.[STORAGE_KEY] ?? "")
  );
};

export const configmap = (kubeConfig: KubeConfiguration): ConfigMap => {
  return new ConfigMap(
    {
      apiVersion: "v1",
      kind: "ConfigMap",
      metadata: {
        name: CONFIGMAP_NAME
      },
      data: {
        [STORAGE_KEY]: "{}"
      }
    },
    kubeConfig
  );
};

export const serializeControllerConfig = (
  ccfg: LatestControllerConfigType,
  kubeConfig: KubeConfiguration
): ConfigMap => {
  const cm = new ConfigMap(
    {
      apiVersion: "v1",
      kind: "ConfigMap",
      metadata: {
        name: CONFIGMAP_NAME
      },
      data: {
        [STORAGE_KEY]: JSON.stringify(ccfg)
      }
    },
    kubeConfig
  );
  cm.setManagementOption({ protect: true }); // Protect so the reconciliation loop doesn't destroy it again.

  return cm;
};
