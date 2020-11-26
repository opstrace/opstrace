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

import { entries, log, diff } from "@opstrace/utils";
import { K8sResource } from "../common";
import {
  DeploymentType,
  StatefulSetType,
  DaemonSetType,
  SecretType,
  ConfigMapType
} from "../kinds";

export const haveLabelsChanged = (
  desired: K8sResource,
  existing: K8sResource
) =>
  entries(desired.labels).find(([k, v]) => existing.labels[k] !== v)
    ? true
    : false;

export type WithMountedVolumeType =
  | DeploymentType
  | StatefulSetType
  | DaemonSetType;

/**
 * Returns true if the resource mounts a Secret or ConfigMap that is in the
 * secrets or configMaps arrays
 * @param resource
 * @param secrets
 * @param configMaps
 */
export const hasMountedVolume = (
  resource: WithMountedVolumeType,
  secrets: SecretType[],
  configMaps: ConfigMapType[]
) => {
  const volumes = resource.spec!.spec!.template.spec!.volumes;
  if (!volumes) {
    return false;
  }
  return volumes.find(v => {
    // Check secrets mounted as a volume
    if (v.secret && v.secret.secretName) {
      const hasSecretChanged = secrets.find(
        s =>
          s.name === v.secret!.secretName && s.namespace === resource.namespace
      );
      if (hasSecretChanged) {
        return true;
      }
    }
    // Check configMaps mounted as a volume
    if (v.configMap && v.configMap.name) {
      const hasCMChanged = configMaps.find(
        c => c.name === v.configMap!.name && c.namespace === resource.namespace
      );
      if (hasCMChanged) {
        return true;
      }
    }
    return false;
  });
};

export function logDifference(name: string, desired: any, existing: any) {
  log.info("%s change in spec: %s", name, JSON.stringify(diff(desired, existing), null, 2))
}