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

import {
  V1Container,
  V1Volume,
  V1PodSpec,
  V1PodTemplateSpec,
  V1ContainerPort,
  V1VolumeMount,
  V1KeyToPath,
  V1EnvVar,
  V1Probe
} from "@kubernetes/client-node";

import { isDeepStrictEqual } from "util";

export const ENV_HASH_NAME = "OPSTRACE_CONTROLLER_VERSION";

export const isPodSpecTemplateEqual = (
  desired: V1PodTemplateSpec,
  existing: V1PodTemplateSpec
): boolean => {
  if (typeof desired.spec !== typeof existing.spec) {
    return false;
  }

  if (
    desired.spec &&
    existing.spec &&
    !isPodSpecEqual(desired.spec, existing.spec)
  ) {
    return false;
  }

  return true;
};

const isPodSpecEqual = (desired: V1PodSpec, existing: V1PodSpec): boolean => {
  if (
    desired.serviceAccountName &&
    existing.serviceAccountName &&
    desired.serviceAccountName !== existing.serviceAccountName
  ) {
    return false;
  }
  if (!areVolumesEqual(desired, existing)) {
    return false;
  }

  if (
    Array.isArray(desired.containers) &&
    Array.isArray(existing.containers) &&
    !(
      desired.containers.length === existing.containers.length &&
      !desired.containers.find(
        (c, i) => !isContainerEqual(c, existing.containers[i])
      )
    )
  ) {
    return false;
  }

  if (
    Array.isArray(desired.initContainers) &&
    Array.isArray(existing.initContainers) &&
    !(
      desired.initContainers.length === existing.initContainers!.length &&
      !desired.initContainers.find(
        (c, i) => !isContainerEqual(c, existing.initContainers![i])
      )
    )
  ) {
    return false;
  }
  if (desired.initContainers && existing.initContainers === undefined) {
    return false;
  }

  return true;
};

const isContainerEqual = (
  desired: V1Container,
  existing: V1Container
): boolean => {
  if (
    !areContainerPortsEqual(desired, existing) ||
    !areVolumeMountsEqual(desired, existing) ||
    !areEnvVariablesEqual(desired, existing) ||
    !areContainerArgsEqual(desired, existing) ||
    !areContainerReadinessProbesEqual(desired, existing) ||
    !areContainerLivenessProbesEqual(desired, existing)
  ) {
    return false;
  }

  if (desired.image !== existing.image) {
    return false;
  }

  return true;
};

const areContainerReadinessProbesEqual = (
  desired: V1Container,
  existing: V1Container
): boolean => {
  return isContainerProbeEqual(
    desired?.readinessProbe,
    existing?.readinessProbe
  );
};

const areContainerLivenessProbesEqual = (
  desired: V1Container,
  existing: V1Container
): boolean => {
  return isContainerProbeEqual(desired?.livenessProbe, existing?.livenessProbe);
};

const isContainerProbeEqual = (
  desired: V1Probe | undefined,
  existing: V1Probe | undefined
): boolean => {
  return (
    isDeepStrictEqual(desired?.exec, existing?.exec) &&
    desired?.failureThreshold === existing?.failureThreshold &&
    isDeepStrictEqual(desired?.httpGet, existing?.httpGet) &&
    desired?.initialDelaySeconds === existing?.initialDelaySeconds &&
    desired?.periodSeconds === existing?.periodSeconds &&
    desired?.successThreshold === existing?.successThreshold &&
    isDeepStrictEqual(desired?.tcpSocket, existing?.tcpSocket) &&
    desired?.timeoutSeconds === existing?.timeoutSeconds
  );
};

const areContainerPortsEqual = (
  desired: V1Container,
  existing: V1Container
): boolean => {
  if (
    Array.isArray(desired.ports) &&
    Array.isArray(existing.ports) &&
    !(
      desired.ports.length === existing.ports!.length &&
      !desired.ports.find(
        (p, i) => !isContainerPortEqual(p, existing.ports![i])
      )
    )
  ) {
    return false;
  }
  if (desired.ports && existing.ports === undefined) {
    return false;
  }

  return true;
};

const areContainerArgsEqual = (
  desired: V1Container,
  existing: V1Container
): boolean => {
  if (
    Array.isArray(desired.args) &&
    Array.isArray(existing.args) &&
    !(
      desired.args.length === existing.args!.length &&
      !desired.args.find((a, i) => a !== existing.args![i])
    )
  ) {
    return false;
  }
  if (desired.args && existing.args === undefined) {
    return false;
  }

  return true;
};

const isContainerPortEqual = (
  desired: V1ContainerPort,
  existing: V1ContainerPort
): boolean => {
  return (
    desired.name === existing.name &&
    desired.containerPort === existing.containerPort &&
    desired.hostPort === existing.hostPort
  );
};

const areEnvVariablesEqual = (
  desired: V1Container,
  existing: V1Container
): boolean => {
  if (
    Array.isArray(desired.env) &&
    Array.isArray(existing.env) &&
    !(
      desired.env.length ===
        existing.env!.filter(e => e.name !== ENV_HASH_NAME).length &&
      !desired.env.find(
        (e, i) =>
          !isEnvVariableEqual(
            e,
            existing.env!.filter(e => e.name !== ENV_HASH_NAME)[i]
          )
      )
    )
  ) {
    return false;
  }
  const desiredLength = (Array.isArray(desired.env) && desired.env.length) || 0;
  const existingLength =
    (Array.isArray(existing.env) && existing.env.length) || 0;
  if (!desiredLength && !existingLength) {
    return true;
  }
  if (desired.env && existing.env === undefined) {
    return false;
  }

  return true;
};

/**
 * Should also check fieldRefs
 */
const isEnvVariableEqual = (desired: V1EnvVar, existing: V1EnvVar): boolean => {
  const isNameEqual = desired.name === existing.name;
  if (
    !(
      (desired.value === undefined || desired.value === "") &&
      (existing.value === undefined || existing.value === "")
    )
  ) {
    return isNameEqual && desired.value === existing.value;
  }
  return isNameEqual;
};

const areVolumeMountsEqual = (
  desired: V1Container,
  existing: V1Container
): boolean => {
  if (
    Array.isArray(desired.volumeMounts) &&
    Array.isArray(existing.volumeMounts) &&
    !(
      desired.volumeMounts.length === existing.volumeMounts!.length &&
      !desired.volumeMounts.find(
        (p, i) => !isVolumeMountEqual(p, existing.volumeMounts![i])
      )
    )
  ) {
    return false;
  }
  if (desired.volumeMounts && existing.volumeMounts === undefined) {
    return false;
  }

  return true;
};

const isVolumeMountEqual = (
  desired: V1VolumeMount,
  existing: V1VolumeMount
): boolean => {
  return (
    desired.name === existing.name &&
    desired.mountPath === existing.mountPath &&
    desired.subPath === existing.subPath
  );
};

const areVolumesEqual = (desired: V1PodSpec, existing: V1PodSpec): boolean => {
  if (
    Array.isArray(desired.volumes) &&
    Array.isArray(existing.volumes) &&
    !(
      desired.volumes.length === existing.volumes!.length &&
      !desired.volumes.find((v, i) => !isVolumeEqual(v, existing.volumes![i]))
    )
  ) {
    return false;
  }
  if (desired.volumes && existing.volumes === undefined) {
    return false;
  }

  return true;
};

const isVolumeEqual = (desired: V1Volume, existing: V1Volume): boolean => {
  if (desired.name !== existing.name) {
    return false;
  }

  if (typeof desired.configMap !== typeof existing.configMap) {
    return false;
  }

  if (desired.configMap !== undefined) {
    if (existing.configMap === undefined) {
      return false;
    }
    if (
      desired.configMap.defaultMode !== undefined &&
      desired.configMap.defaultMode !== existing.configMap.defaultMode
    ) {
      return false;
    }
    if (
      desired.configMap.name !== undefined &&
      desired.configMap.name !== existing.configMap.name
    ) {
      return false;
    }
    if (
      desired.configMap.optional !== undefined &&
      desired.configMap.optional !== existing.configMap.optional
    ) {
      return false;
    }
    if (typeof desired.configMap.items !== typeof existing.configMap.items) {
      return false;
    }
    if (
      !areVolumeItemsEqual(desired.configMap.items, existing.configMap.items)
    ) {
      return false;
    }
  }

  if (typeof desired.secret !== typeof existing.secret) {
    return false;
  }

  if (desired.secret !== undefined) {
    if (existing.secret === undefined) {
      return false;
    }
    if (
      desired.secret.defaultMode !== undefined &&
      desired.secret.defaultMode !== existing.secret.defaultMode
    ) {
      return false;
    }
    if (
      desired.secret.secretName !== undefined &&
      desired.secret.secretName !== existing.secret.secretName
    ) {
      return false;
    }
    if (
      desired.secret.optional !== undefined &&
      desired.secret.optional !== existing.secret.optional
    ) {
      return false;
    }
    if (typeof desired.secret.items !== typeof existing.secret.items) {
      return false;
    }
    if (!areVolumeItemsEqual(desired.secret.items, existing.secret.items)) {
      return false;
    }
  }

  return true;
};

const areVolumeItemsEqual = (
  desired: Array<V1KeyToPath> | undefined,
  existing: Array<V1KeyToPath> | undefined
): boolean => {
  if (
    Array.isArray(desired) &&
    Array.isArray(existing) &&
    !(
      desired.length === existing!.length &&
      !desired.find((s, i) => !isVolumeItemEqual(s, existing![i]))
    )
  ) {
    return false;
  }

  return true;
};

const isVolumeItemEqual = (
  desired: V1KeyToPath,
  existing: V1KeyToPath
): boolean => {
  return (
    desired.key === existing.key &&
    desired.mode === existing.mode &&
    desired.path === existing.path
  );
};
