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
  K8sResource,
  isApiService,
  isIngress,
  isStorageClass,
  isPersistentVolumeClaim,
  StatefulSetType,
  isStatefulSet,
  isServiceAccount,
  isService,
  isSecret,
  isRoleBinding,
  isRole,
  isNamespace,
  DeploymentType,
  isDeployment,
  DaemonSetType,
  isDaemonSet,
  isCustomResourceDefinition,
  isConfigMap,
  isClusterRoleBinding,
  isClusterRole,
  isPodSecurityPolicy,
  find
} from "../kinds";
import {
  WithMountedVolumeType,
  hasMountedVolume,
  ENV_HASH_NAME
} from "../equality";
import {
  isV1AlertmanagerResource,
  isV1PodmonitorResource,
  isV1PrometheusResource,
  isV1PrometheusruleResource,
  isV1ServicemonitorResource,
  isV1CertificateResource,
  isV1CertificaterequestResource,
  isV1ChallengeResource,
  isV1ClusterissuerResource,
  isV1IssuerResource,
  isV1OrderResource
} from "../custom-resources";

export const reduceCollection = (resources: Array<K8sResource>) => ({
  Ingresses: resources.filter(isIngress),
  StorageClasses: resources.filter(isStorageClass),
  PersistentVolumeClaims: resources.filter(isPersistentVolumeClaim),
  StatefulSets: resources.filter(isStatefulSet),
  ServiceAccounts: resources.filter(isServiceAccount),
  Services: resources.filter(isService),
  Secrets: resources.filter(isSecret),
  RoleBindings: resources.filter(isRoleBinding),
  Roles: resources.filter(isRole),
  Namespaces: resources.filter(isNamespace),
  Deployments: resources.filter(isDeployment),
  DaemonSets: resources.filter(isDaemonSet),
  CustomResourceDefinitions: resources.filter(isCustomResourceDefinition),
  ConfigMaps: resources.filter(isConfigMap),
  ClusterRoleBindings: resources.filter(isClusterRoleBinding),
  ClusterRoles: resources.filter(isClusterRole),
  PodSecurityPolicies: resources.filter(isPodSecurityPolicy),
  ApiServices: resources.filter(isApiService),
  Alertmanagers: resources.filter(isV1AlertmanagerResource),
  PodMonitors: resources.filter(isV1PodmonitorResource),
  Prometheuses: resources.filter(isV1PrometheusResource),
  PrometheusRules: resources.filter(isV1PrometheusruleResource),
  ServiceMonitors: resources.filter(isV1ServicemonitorResource),
  Certificates: resources.filter(isV1CertificateResource),
  CertificateRequests: resources.filter(isV1CertificaterequestResource),
  Challenges: resources.filter(isV1ChallengeResource),
  ClusterIssuers: resources.filter(isV1ClusterissuerResource),
  Issuers: resources.filter(isV1IssuerResource),
  Orders: resources.filter(isV1OrderResource)
});

type ResourceMap = ReturnType<typeof reduceCollection>;

/**
 * Ensures all resources with volume updates, via changing configmaps/secrets,
 * are included in the toUpdate datastructure.
 * @param toUpdate
 * @param desired
 */
export const addResourcesWithVolumeUpdates = (
  toUpdate: ResourceMap,
  desired: ResourceMap
): ResourceMap => {
  const deploymentsWithVolumeChange = desired.Deployments.filter(r =>
    hasMountedVolume(r, toUpdate.Secrets, toUpdate.ConfigMaps)
  ).map(r => ensureResourceIsUpdated<DeploymentType>(r));

  const statefulSetsWithVolumeChange = desired.StatefulSets.filter(r =>
    hasMountedVolume(r, toUpdate.Secrets, toUpdate.ConfigMaps)
  ).map(r => ensureResourceIsUpdated<StatefulSetType>(r));

  const daemonSetsWithVolumeChange = desired.DaemonSets.filter(r =>
    hasMountedVolume(r, toUpdate.Secrets, toUpdate.ConfigMaps)
  ).map(r => ensureResourceIsUpdated<DaemonSetType>(r));

  deploymentsWithVolumeChange.forEach(r => {
    if (!find(r, toUpdate.Deployments)) {
      toUpdate.Deployments.push(r);
    }
  });

  statefulSetsWithVolumeChange.forEach(r => {
    if (!find(r, toUpdate.StatefulSets)) {
      toUpdate.StatefulSets.push(r);
    }
  });

  daemonSetsWithVolumeChange.forEach(r => {
    if (!find(r, toUpdate.DaemonSets)) {
      toUpdate.DaemonSets.push(r);
    }
  });

  return toUpdate;
};

/**
 * Mutates the resource to ensure an update will be triggered in kubernetes
 * @param resource
 */
export const ensureResourceIsUpdated = <T extends WithMountedVolumeType>(
  resource: T
): T => {
  resource.spec.spec!.template!.spec!.containers.forEach(c => {
    if (!c.env) {
      c.env = [];
    }
    c.env = [
      // Filter out the env variable if we've previously set it
      ...c.env.filter(e => e.name !== ENV_HASH_NAME),
      // Add new env variable with the value set to the currentVersion + a random value.
      {
        name: ENV_HASH_NAME,
        value: `updated_because_volume_changed__$${Math.random()
          .toString(36)
          .toUpperCase()}`
      }
    ];
  });

  return resource;
};
