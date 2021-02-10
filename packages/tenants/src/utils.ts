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

import { ConfigMap, KubeConfiguration } from "@opstrace/kubernetes";
import { Tenants, tenantSchema } from "./types";

export const TENANTS_STORAGE_CONFIGMAP_NAME = "opstrace-tenants-database";
export const TENANTS_STORAGE_KEY = "tenants.json";

export const isTenantStorage = (configMap: ConfigMap): boolean =>
  configMap.name === TENANTS_STORAGE_CONFIGMAP_NAME;

export const deserialize = (configMap: ConfigMap): Tenants => {
  const _tenants: [] = JSON.parse(
    configMap.spec.data?.[TENANTS_STORAGE_KEY] || ""
  );
  return _tenants.map((t: Tenants) => tenantSchema.cast(t));
};

export const serialize = (
  tenants: Tenants,
  kubeConfig: KubeConfiguration
): ConfigMap => {
  const cm = new ConfigMap(
    {
      apiVersion: "v1",
      kind: "ConfigMap",
      metadata: {
        name: TENANTS_STORAGE_CONFIGMAP_NAME
      },
      data: {
        [TENANTS_STORAGE_KEY]: JSON.stringify(tenants)
      }
    },
    kubeConfig
  );
  cm.setManagementOption({ protect: true }); // Protect so the reconciliation loop doesn't destroy it again.

  return cm;
};
