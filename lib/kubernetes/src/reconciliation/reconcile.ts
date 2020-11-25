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

import { delay, all, call } from "redux-saga/effects";

import { reduceCollection, addResourcesWithVolumeUpdates } from "./utils";

import { log, SECOND } from "@opstrace/utils";
import {
  find,
  K8sResource,
  Nodes,
  Ingresses,
  StorageClasses,
  PersistentVolumeClaims,
  ServiceAccounts,
  PersistentVolumes,
  StatefulSets,
  Services,
  Secrets,
  RoleBindings,
  Roles,
  Namespaces,
  Deployments,
  CustomResourceDefinitions,
  ConfigMaps,
  ClusterRoleBindings,
  DaemonSets,
  ClusterRoles,
  PodSecurityPolicies,
  ApiServices,
  ResourceCollection
} from "../kinds";

import { createResource, updateResource, deleteResource } from "../api";

import {
  V1AlertmanagerResources,
  V1PodmonitorResources,
  V1PrometheusResources,
  V1PrometheusruleResources,
  V1ServicemonitorResources,
  V1CertificateResources,
  V1CertificaterequestResources,
  V1ChallengeResources,
  V1ClusterissuerResources,
  V1IssuerResources,
  V1OrderResources
} from "../custom-resources";

import {
  haveLabelsChanged,
  hasStatefulSetChanged,
  hasServiceChanged,
  hasSecretChanged,
  hasDeploymentChanged,
  hasDaemonSetChanged,
  hasConfigMapChanged,
  hasPrometheusRuleChanged,
  hasServiceMonitorChanged,
  hasIngressChanged,
  hasAlertManagerChanged,
  hasPrometheusChanged
} from "../equality";

import { entries } from "@opstrace/utils";

export type ReconcileResourceTypes = {
  Nodes: Nodes;
  Ingresses: Ingresses;
  StorageClasses: StorageClasses;
  PersistentVolumes: PersistentVolumes;
  PersistentVolumeClaims: PersistentVolumeClaims;
  StatefulSets: StatefulSets;
  ServiceAccounts: ServiceAccounts;
  Services: Services;
  Secrets: Secrets;
  RoleBindings: RoleBindings;
  Roles: Roles;
  Namespaces: Namespaces;
  Deployments: Deployments;
  DaemonSets: DaemonSets;
  CustomResourceDefinitions: CustomResourceDefinitions;
  ConfigMaps: ConfigMaps;
  ClusterRoleBindings: ClusterRoleBindings;
  ClusterRoles: ClusterRoles;
  PodSecurityPolicies: PodSecurityPolicies;
  ApiServices: ApiServices;
  Alertmanagers: V1AlertmanagerResources;
  PodMonitors: V1PodmonitorResources;
  Prometheuses: V1PrometheusResources;
  PrometheusRules: V1PrometheusruleResources;
  ServiceMonitors: V1ServicemonitorResources;
  Certificates: V1CertificateResources;
  CertificateRequests: V1CertificaterequestResources;
  Challenges: V1ChallengeResources;
  ClusterIssuers: V1ClusterissuerResources;
  Issuers: V1IssuerResources;
  Orders: V1OrderResources;
};

export function* reconcile(
  desired: ResourceCollection,
  actual: Partial<ReconcileResourceTypes>
) {
  const actualState: ReconcileResourceTypes = {
    Nodes: [],
    Ingresses: [],
    StorageClasses: [],
    PersistentVolumes: [],
    PersistentVolumeClaims: [],
    StatefulSets: [],
    ServiceAccounts: [],
    Services: [],
    Secrets: [],
    RoleBindings: [],
    Roles: [],
    Namespaces: [],
    Deployments: [],
    DaemonSets: [],
    CustomResourceDefinitions: [],
    ConfigMaps: [],
    ClusterRoleBindings: [],
    ClusterRoles: [],
    PodSecurityPolicies: [],
    ApiServices: [],
    Alertmanagers: [],
    PodMonitors: [],
    Prometheuses: [],
    PrometheusRules: [],
    ServiceMonitors: [],
    Certificates: [],
    CertificateRequests: [],
    Challenges: [],
    ClusterIssuers: [],
    Issuers: [],
    Orders: [],
    ...actual
  };
  try {
    const createCollection: K8sResource[] = [];
    const deleteCollection: K8sResource[] = [];
    const updateCollection: K8sResource[] = [];

    const desiredState = reduceCollection(desired.get());

    desiredState.Ingresses.forEach(r => {
      const existing = find(r, actualState.Ingresses);
      if (!existing) {
        createCollection.push(r);
        return;
      }
      if (haveLabelsChanged(r, existing) || hasIngressChanged(r, existing)) {
        if (!r.shouldPreventUpdate()) {
          updateCollection.push(r);
        }
      }
    });
    actualState.Ingresses.forEach(r => {
      const shouldKeep = find(r, desiredState.Ingresses);
      if (!shouldKeep && r.isOurs() && !r.isTerminating() && !r.isProtected()) {
        deleteCollection.push(r);
      }
    });

    desiredState.StorageClasses.forEach(r => {
      const existing = find(r, actualState.StorageClasses);
      if (!existing) {
        createCollection.push(r);
        return;
      }
      if (haveLabelsChanged(r, existing)) {
        if (!r.shouldPreventUpdate()) {
          updateCollection.push(r);
        }
      }
    });
    actualState.StorageClasses.forEach(r => {
      const shouldKeep = find(r, desiredState.StorageClasses);
      if (!shouldKeep && r.isOurs() && !r.isTerminating() && !r.isProtected()) {
        deleteCollection.push(r);
      }
    });

    desiredState.PersistentVolumeClaims.forEach(r => {
      const existing = find(r, actualState.PersistentVolumeClaims);
      if (!existing) {
        createCollection.push(r);
        return;
      }
      if (haveLabelsChanged(r, existing)) {
        if (!r.shouldPreventUpdate()) {
          updateCollection.push(r);
        }
      }
    });
    actualState.PersistentVolumeClaims.forEach(r => {
      const shouldKeep = find(r, desiredState.PersistentVolumeClaims);
      if (!shouldKeep && r.isOurs() && !r.isTerminating() && !r.isProtected()) {
        deleteCollection.push(r);
      }
    });

    desiredState.StatefulSets.forEach(r => {
      const existing = find(r, actualState.StatefulSets);
      if (!existing) {
        createCollection.push(r);
        return;
      }
      if (
        haveLabelsChanged(r, existing) ||
        hasStatefulSetChanged(r, existing)
      ) {
        if (!r.shouldPreventUpdate()) {
          updateCollection.push(r);
        }
      }
    });
    actualState.StatefulSets.forEach(r => {
      const shouldKeep = find(r, desiredState.StatefulSets);
      if (!shouldKeep && r.isOurs() && !r.isTerminating() && !r.isProtected()) {
        deleteCollection.push(r);
      }
    });

    desiredState.ServiceAccounts.forEach(r => {
      const existing = find(r, actualState.ServiceAccounts);
      if (!existing) {
        createCollection.push(r);
        return;
      }
      if (haveLabelsChanged(r, existing)) {
        if (!r.shouldPreventUpdate()) {
          updateCollection.push(r);
        }
      }
    });
    actualState.ServiceAccounts.forEach(r => {
      const shouldKeep = find(r, desiredState.ServiceAccounts);
      if (!shouldKeep && r.isOurs() && !r.isTerminating() && !r.isProtected()) {
        deleteCollection.push(r);
      }
    });

    desiredState.Services.forEach(r => {
      const existing = find(r, actualState.Services);
      if (!existing) {
        createCollection.push(r);
        return;
      }
      if (haveLabelsChanged(r, existing) || hasServiceChanged(r, existing)) {
        if (!r.shouldPreventUpdate()) {
          updateCollection.push(r);
        }
      }
    });
    actualState.Services.forEach(r => {
      const shouldKeep = find(r, desiredState.Services);
      if (!shouldKeep && r.isOurs() && !r.isTerminating() && !r.isProtected()) {
        deleteCollection.push(r);
      }
    });

    desiredState.Secrets.forEach(r => {
      const existing = find(r, actualState.Secrets);
      if (!existing) {
        createCollection.push(r);
        return;
      }
      if (haveLabelsChanged(r, existing) || hasSecretChanged(r, existing)) {
        if (!r.shouldPreventUpdate()) {
          updateCollection.push(r);
        }
      }
    });
    actualState.Secrets.forEach(r => {
      const shouldKeep = find(r, desiredState.Secrets);
      if (!shouldKeep && r.isOurs() && !r.isTerminating() && !r.isProtected()) {
        deleteCollection.push(r);
      }
    });

    desiredState.RoleBindings.forEach(r => {
      const existing = find(r, actualState.RoleBindings);
      if (!existing) {
        createCollection.push(r);
        return;
      }
      if (haveLabelsChanged(r, existing)) {
        if (!r.shouldPreventUpdate()) {
          updateCollection.push(r);
        }
      }
    });
    actualState.RoleBindings.forEach(r => {
      const shouldKeep = find(r, desiredState.RoleBindings);
      if (!shouldKeep && r.isOurs() && !r.isTerminating() && !r.isProtected()) {
        deleteCollection.push(r);
      }
    });

    desiredState.Roles.forEach(r => {
      const existing = find(r, actualState.Roles);
      if (!existing) {
        createCollection.push(r);
        return;
      }
      if (haveLabelsChanged(r, existing)) {
        if (!r.shouldPreventUpdate()) {
          updateCollection.push(r);
        }
      }
    });
    actualState.Roles.forEach(r => {
      const shouldKeep = find(r, desiredState.Roles);
      if (!shouldKeep && r.isOurs() && !r.isTerminating() && !r.isProtected()) {
        deleteCollection.push(r);
      }
    });

    desiredState.Namespaces.forEach(r => {
      const existing = find(r, actualState.Namespaces);
      if (!existing) {
        createCollection.push(r);
        return;
      }
      if (haveLabelsChanged(r, existing)) {
        if (!r.shouldPreventUpdate()) {
          updateCollection.push(r);
        }
      }
    });
    actualState.Namespaces.forEach(r => {
      const shouldKeep = find(r, desiredState.Namespaces);
      if (!shouldKeep && r.isOurs() && !r.isTerminating() && !r.isProtected()) {
        deleteCollection.push(r);
      }
    });

    desiredState.Deployments.forEach(r => {
      const existing = find(r, actualState.Deployments);
      if (!existing) {
        createCollection.push(r);
        return;
      }
      if (haveLabelsChanged(r, existing) || hasDeploymentChanged(r, existing)) {
        if (!r.shouldPreventUpdate()) {
          updateCollection.push(r);
        }
      }
    });
    actualState.Deployments.forEach(r => {
      const shouldKeep = find(r, desiredState.Deployments);
      if (!shouldKeep && r.isOurs() && !r.isTerminating() && !r.isProtected()) {
        deleteCollection.push(r);
      }
    });

    desiredState.DaemonSets.forEach(r => {
      const existing = find(r, actualState.DaemonSets);
      if (!existing) {
        createCollection.push(r);
        return;
      }
      if (haveLabelsChanged(r, existing) || hasDaemonSetChanged(r, existing)) {
        if (!r.shouldPreventUpdate()) {
          updateCollection.push(r);
        }
      }
    });
    actualState.DaemonSets.forEach(r => {
      const shouldKeep = find(r, desiredState.DaemonSets);
      if (!shouldKeep && r.isOurs() && !r.isTerminating() && !r.isProtected()) {
        deleteCollection.push(r);
      }
    });

    desiredState.CustomResourceDefinitions.forEach(r => {
      const existing = find(r, actualState.CustomResourceDefinitions);
      if (!existing) {
        createCollection.push(r);
        return;
      }
      if (haveLabelsChanged(r, existing)) {
        if (!r.shouldPreventUpdate()) {
          updateCollection.push(r);
        }
      }
    });
    actualState.CustomResourceDefinitions.forEach(r => {
      const shouldKeep = find(r, desiredState.CustomResourceDefinitions);
      if (!shouldKeep && r.isOurs() && !r.isTerminating() && !r.isProtected()) {
        deleteCollection.push(r);
      }
    });

    desiredState.ConfigMaps.forEach(r => {
      const existing = find(r, actualState.ConfigMaps);
      if (!existing) {
        createCollection.push(r);
        return;
      }
      if (haveLabelsChanged(r, existing) || hasConfigMapChanged(r, existing)) {
        if (!r.shouldPreventUpdate()) {
          updateCollection.push(r);
        }
      }
    });
    actualState.ConfigMaps.forEach(r => {
      const shouldKeep = find(r, desiredState.ConfigMaps);
      if (!shouldKeep && r.isOurs() && !r.isTerminating() && !r.isProtected()) {
        deleteCollection.push(r);
      }
    });

    desiredState.ClusterRoleBindings.forEach(r => {
      const existing = find(r, actualState.ClusterRoleBindings);
      if (!existing) {
        createCollection.push(r);
        return;
      }
      if (haveLabelsChanged(r, existing)) {
        if (!r.shouldPreventUpdate()) {
          updateCollection.push(r);
        }
      }
    });
    actualState.ClusterRoleBindings.forEach(r => {
      const shouldKeep = find(r, desiredState.ClusterRoleBindings);
      if (!shouldKeep && r.isOurs() && !r.isTerminating() && !r.isProtected()) {
        deleteCollection.push(r);
      }
    });

    desiredState.ClusterRoles.forEach(r => {
      const existing = find(r, actualState.ClusterRoles);
      if (!existing) {
        createCollection.push(r);
        return;
      }
      if (haveLabelsChanged(r, existing)) {
        if (!r.shouldPreventUpdate()) {
          updateCollection.push(r);
        }
      }
    });
    actualState.ClusterRoles.forEach(r => {
      const shouldKeep = find(r, desiredState.ClusterRoles);
      if (!shouldKeep && r.isOurs() && !r.isTerminating() && !r.isProtected()) {
        deleteCollection.push(r);
      }
    });

    desiredState.PodSecurityPolicies.forEach(r => {
      const existing = find(r, actualState.PodSecurityPolicies);
      if (!existing) {
        createCollection.push(r);
        return;
      }
      if (haveLabelsChanged(r, existing)) {
        if (!r.shouldPreventUpdate()) {
          updateCollection.push(r);
        }
      }
    });
    actualState.PodSecurityPolicies.forEach(r => {
      const shouldKeep = find(r, desiredState.PodSecurityPolicies);
      if (!shouldKeep && r.isOurs() && !r.isTerminating() && !r.isProtected()) {
        deleteCollection.push(r);
      }
    });

    desiredState.ApiServices.forEach(r => {
      const existing = find(r, actualState.ApiServices);
      if (!existing) {
        createCollection.push(r);
        return;
      }
      if (haveLabelsChanged(r, existing)) {
        if (!r.shouldPreventUpdate()) {
          updateCollection.push(r);
        }
      }
    });
    actualState.ApiServices.forEach(r => {
      const shouldKeep = find(r, desiredState.ApiServices);
      if (!shouldKeep && r.isOurs() && !r.isTerminating() && !r.isProtected()) {
        deleteCollection.push(r);
      }
    });

    desiredState.Alertmanagers.forEach(r => {
      const existing = find(r, actualState.Alertmanagers);
      if (!existing) {
        createCollection.push(r);
        return;
      }
      if (
        haveLabelsChanged(r, existing) ||
        hasAlertManagerChanged(r, existing)
      ) {
        if (!r.shouldPreventUpdate()) {
          updateCollection.push(r);
        }
      }
    });
    actualState.Alertmanagers.forEach(r => {
      const shouldKeep = find(r, desiredState.Alertmanagers);
      if (!shouldKeep && r.isOurs() && !r.isTerminating() && !r.isProtected()) {
        deleteCollection.push(r);
      }
    });

    desiredState.PodMonitors.forEach(r => {
      const existing = find(r, actualState.PodMonitors);
      if (!existing) {
        createCollection.push(r);
        return;
      }
      if (haveLabelsChanged(r, existing)) {
        if (!r.shouldPreventUpdate()) {
          updateCollection.push(r);
        }
      }
    });
    actualState.PodMonitors.forEach(r => {
      const shouldKeep = find(r, desiredState.PodMonitors);
      if (!shouldKeep && r.isOurs() && !r.isTerminating() && !r.isProtected()) {
        deleteCollection.push(r);
      }
    });

    desiredState.Prometheuses.forEach(r => {
      const existing = find(r, actualState.Prometheuses);
      if (!existing) {
        createCollection.push(r);
        return;
      }
      if (haveLabelsChanged(r, existing) || hasPrometheusChanged(r, existing)) {
        if (!r.shouldPreventUpdate()) {
          updateCollection.push(r);
        }
      }
    });
    actualState.Prometheuses.forEach(r => {
      const shouldKeep = find(r, desiredState.Prometheuses);
      if (!shouldKeep && r.isOurs() && !r.isTerminating() && !r.isProtected()) {
        deleteCollection.push(r);
      }
    });

    desiredState.PrometheusRules.forEach(r => {
      const existing = find(r, actualState.PrometheusRules);
      if (!existing) {
        createCollection.push(r);
        return;
      }
      if (
        haveLabelsChanged(r, existing) ||
        hasPrometheusRuleChanged(r, existing)
      ) {
        if (!r.shouldPreventUpdate()) {
          updateCollection.push(r);
        }
      }
    });
    actualState.PrometheusRules.forEach(r => {
      const shouldKeep = find(r, desiredState.PrometheusRules);
      if (!shouldKeep && r.isOurs() && !r.isTerminating() && !r.isProtected()) {
        deleteCollection.push(r);
      }
    });

    desiredState.ServiceMonitors.forEach(r => {
      const existing = find(r, actualState.ServiceMonitors);
      if (!existing) {
        createCollection.push(r);
        return;
      }
      if (
        haveLabelsChanged(r, existing) ||
        hasServiceMonitorChanged(r, existing)
      ) {
        if (!r.shouldPreventUpdate()) {
          updateCollection.push(r);
        }
      }
    });
    actualState.ServiceMonitors.forEach(r => {
      const shouldKeep = find(r, desiredState.ServiceMonitors);
      if (!shouldKeep && r.isOurs() && !r.isTerminating() && !r.isProtected()) {
        deleteCollection.push(r);
      }
    });

    desiredState.Certificates.forEach(r => {
      const existing = find(r, actualState.Certificates);
      if (!existing) {
        createCollection.push(r);
        return;
      }
      if (haveLabelsChanged(r, existing)) {
        if (!r.shouldPreventUpdate()) {
          updateCollection.push(r);
        }
      }
    });
    actualState.Certificates.forEach(r => {
      const shouldKeep = find(r, desiredState.Certificates);
      if (!shouldKeep && r.isOurs() && !r.isTerminating() && !r.isProtected()) {
        deleteCollection.push(r);
      }
    });

    desiredState.CertificateRequests.forEach(r => {
      const existing = find(r, actualState.CertificateRequests);
      if (!existing) {
        createCollection.push(r);
        return;
      }
      if (haveLabelsChanged(r, existing)) {
        if (!r.shouldPreventUpdate()) {
          updateCollection.push(r);
        }
      }
    });
    actualState.CertificateRequests.forEach(r => {
      const shouldKeep = find(r, desiredState.CertificateRequests);
      if (!shouldKeep && r.isOurs() && !r.isTerminating() && !r.isProtected()) {
        deleteCollection.push(r);
      }
    });

    desiredState.Challenges.forEach(r => {
      const existing = find(r, actualState.Challenges);
      if (!existing) {
        createCollection.push(r);
        return;
      }
      if (haveLabelsChanged(r, existing)) {
        if (!r.shouldPreventUpdate()) {
          updateCollection.push(r);
        }
      }
    });
    actualState.Challenges.forEach(r => {
      const shouldKeep = find(r, desiredState.Challenges);
      if (!shouldKeep && r.isOurs() && !r.isTerminating() && !r.isProtected()) {
        deleteCollection.push(r);
      }
    });

    desiredState.ClusterIssuers.forEach(r => {
      const existing = find(r, actualState.ClusterIssuers);
      if (!existing) {
        createCollection.push(r);
        return;
      }
      if (haveLabelsChanged(r, existing)) {
        if (!r.shouldPreventUpdate()) {
          updateCollection.push(r);
        }
      }
    });
    actualState.ClusterIssuers.forEach(r => {
      const shouldKeep = find(r, desiredState.ClusterIssuers);
      if (!shouldKeep && r.isOurs() && !r.isTerminating() && !r.isProtected()) {
        deleteCollection.push(r);
      }
    });

    desiredState.Issuers.forEach(r => {
      const existing = find(r, actualState.Issuers);
      if (!existing) {
        createCollection.push(r);
        return;
      }
      if (haveLabelsChanged(r, existing)) {
        if (!r.shouldPreventUpdate()) {
          updateCollection.push(r);
        }
      }
    });
    actualState.Issuers.forEach(r => {
      const shouldKeep = find(r, desiredState.Issuers);
      if (!shouldKeep && r.isOurs() && !r.isTerminating() && !r.isProtected()) {
        deleteCollection.push(r);
      }
    });

    desiredState.Orders.forEach(r => {
      const existing = find(r, actualState.Orders);
      if (!existing) {
        createCollection.push(r);
        return;
      }
      if (haveLabelsChanged(r, existing)) {
        if (!r.shouldPreventUpdate()) {
          updateCollection.push(r);
        }
      }
    });
    actualState.Orders.forEach(r => {
      const shouldKeep = find(r, desiredState.Orders);
      if (!shouldKeep && r.isOurs() && !r.isTerminating() && !r.isProtected()) {
        deleteCollection.push(r);
      }
    });

    const toUpdate = addResourcesWithVolumeUpdates(
      reduceCollection(updateCollection),
      desiredState
    );

    // Create a new updateCollection since we've possibly added items to toUpdate with addResourcesWithVolumeUpdates
    const comprehensiveUpdateCollection = entries(toUpdate).reduce<
      K8sResource[]
    >((acc, [_, resources]) => acc.concat(resources), []);

    yield call(applyRateLimitedApiRequests, createCollection, "create");
    yield call(applyRateLimitedApiRequests, deleteCollection, "delete");
    yield call(
      applyRateLimitedApiRequests,
      comprehensiveUpdateCollection,
      "update"
    );
  } catch (e) {
    log.error(`Error in reconcile loop: ${e}`);
  }
}

function* applyRateLimitedApiRequests<T extends K8sResource>(
  resources: T[],
  method: "create" | "delete" | "update"
) {
  // call method on resources in chunks so we don't get rate limited
  const chunkSize = 10;
  let index = 0;
  while (index < resources.length) {
    const slice = resources.slice(index, index + chunkSize);

    log.info(
      `API ${method} request ${index / chunkSize + 1} of ${Math.ceil(
        resources.length / chunkSize
      )}`
    );

    if (method === "create") {
      entries(reduceCollection(slice)).forEach(([name, resources]) => {
        if (resources.length) {
          log.info(`Creating ${resources.length} ${name}:`);
          resources.forEach((r: K8sResource) =>
            log.info(`Creating ${name}: ${r.namespace}/${r.name}`)
          );
        }
      });
      yield all([slice.map(createResource)]);
    }

    if (method === "update") {
      entries(reduceCollection(slice)).forEach(([name, resources]) => {
        if (resources.length) {
          log.info(`Updating ${resources.length} ${name}:`);
          resources.forEach((r: K8sResource) =>
            log.info(`Updating ${name}: ${r.namespace}/${r.name}`)
          );
        }
      });
      yield all([slice.map(updateResource)]);
    }

    if (method === "delete") {
      entries(reduceCollection(slice)).forEach(([name, resources]) => {
        if (name === "Namespaces") {
          return;
        }
        if (resources.length) {
          log.info(`Deleting ${resources.length} ${name}:`);
          resources.forEach((r: K8sResource) =>
            log.info(`Deleting ${name}: ${r.namespace}/${r.name}`)
          );
        }
      });
      yield all([slice.map(deleteResource)]);
    }

    yield delay(1 * SECOND);
    index += chunkSize;
  }
}
