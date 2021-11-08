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

import { delay, all, call, CallEffect } from "redux-saga/effects";

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
  V1OrderResources,
  V1Alpha1CortexResources,
  V1ClickhouseinstallationResources,
  V1JaegerResources
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
  hasPrometheusChanged,
  hasCertificateChanged,
  hasRoleChanged,
  hasClusterRoleChanged,
  hasCustomResourceDefinitionChanged,
  hasCortexSpecChanged,
  hasClickhouseinstallationSpecChanged,
  hasJaegerSpecChanged
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
  Cortices: V1Alpha1CortexResources;
  Clickhouses: V1ClickhouseinstallationResources;
  Jaegers: V1JaegerResources;
};

// Keep track of the last time we logged about missing 'opstrace' annotations.
// This avoids flooding logs when something is being ignored by the controller,
// while still ensuring that it's consistently reported and visible.
const NOT_OURS_LOG_TTL_MILLIS = 5 * 60 * 1000; // 5 minutes
let notOursLastLogMillis = 0;

export function* reconcile(
  desired: ResourceCollection,
  actual: Partial<ReconcileResourceTypes>,
  isDestroyingCluster: boolean
): Generator<CallEffect, void, unknown> {
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
    Cortices: [],
    Clickhouses: [],
    Jaegers: [],
    ...actual
  };
  try {
    const createCollection: K8sResource[] = [];
    const deleteCollection: K8sResource[] = [];
    const updateCollection: K8sResource[] = [];
    const notOursCollection: K8sResource[] = [];

    const desiredState = reduceCollection(desired.get());

    // Add an annotation with the controller version. This is used to check if
    // the CRD requires an update since typescript fails at comparing the CRD
    // schemas.
    desiredState.CustomResourceDefinitions.map(e => {
      e.setManagementVersion();
    });

    // First thing is to ensure CRDs are reconciled otherwise we might end up
    // trying to create resources (ex Prometheus ServiceMonitor objects) when
    // the CRD doesn't exist yet.
    reconcileResourceType(
      desiredState.CustomResourceDefinitions,
      actualState.CustomResourceDefinitions,
      hasCustomResourceDefinitionChanged,
      null,
      createCollection,
      deleteCollection,
      updateCollection,
      notOursCollection
    );

    reconcileResourceType(
      desiredState.Ingresses,
      actualState.Ingresses,
      (desired, existing) => hasIngressChanged(desired, existing),
      null,
      createCollection,
      deleteCollection,
      updateCollection,
      notOursCollection
    );

    reconcileResourceType(
      desiredState.StorageClasses,
      actualState.StorageClasses,
      null,
      null,
      createCollection,
      deleteCollection,
      updateCollection,
      notOursCollection
    );

    reconcileResourceType(
      desiredState.PersistentVolumeClaims,
      actualState.PersistentVolumeClaims,
      null,
      // Operators may create their own PVCs, which sometimes do not get cleaned up automatically.
      // Specifically, this is observed with this prometheus-operator PVC in tenant namespaces:
      //   'prometheus-system-prometheus-db-prometheus-system-prometheus-0'
      // Although prometheus-operator allows customizing PVC annotations, during normal operation
      // we do not want them labeled as owned by us since we aren't managing them, but during
      // destroy we want to ensure that they are all cleanly torn down.
      isDestroyingCluster
        ? _pvc => true // during cluster destroy, delete all PVCs regardless of attributes
        : null,
      createCollection,
      deleteCollection,
      updateCollection,
      notOursCollection
    );

    reconcileResourceType(
      desiredState.StatefulSets,
      actualState.StatefulSets,
      (desired, existing) => hasStatefulSetChanged(desired, existing),
      null,
      createCollection,
      deleteCollection,
      updateCollection,
      notOursCollection
    );

    reconcileResourceType(
      desiredState.ServiceAccounts,
      actualState.ServiceAccounts,
      null,
      null,
      createCollection,
      deleteCollection,
      updateCollection,
      notOursCollection
    );

    reconcileResourceType(
      desiredState.Services,
      actualState.Services,
      (desired, existing) => hasServiceChanged(desired, existing),
      null,
      createCollection,
      deleteCollection,
      updateCollection,
      notOursCollection
    );

    reconcileResourceType(
      desiredState.Secrets,
      actualState.Secrets,
      (desired, existing) => hasSecretChanged(desired, existing),
      null,
      createCollection,
      deleteCollection,
      updateCollection,
      notOursCollection
    );

    reconcileResourceType(
      desiredState.RoleBindings,
      actualState.RoleBindings,
      null,
      null,
      createCollection,
      deleteCollection,
      updateCollection,
      notOursCollection
    );

    reconcileResourceType(
      desiredState.Roles,
      actualState.Roles,
      (desired, existing) => hasRoleChanged(desired, existing),
      null,
      createCollection,
      deleteCollection,
      updateCollection,
      notOursCollection
    );

    reconcileResourceType(
      desiredState.Namespaces,
      actualState.Namespaces,
      null,
      null,
      createCollection,
      deleteCollection,
      updateCollection,
      notOursCollection
    );

    reconcileResourceType(
      desiredState.Deployments,
      actualState.Deployments,
      (desired, existing) => hasDeploymentChanged(desired, existing),
      null,
      createCollection,
      deleteCollection,
      updateCollection,
      notOursCollection
    );

    reconcileResourceType(
      desiredState.DaemonSets,
      actualState.DaemonSets,
      (desired, existing) => hasDaemonSetChanged(desired, existing),
      null,
      createCollection,
      deleteCollection,
      updateCollection,
      notOursCollection
    );

    reconcileResourceType(
      desiredState.ConfigMaps,
      actualState.ConfigMaps,
      (desired, existing) => hasConfigMapChanged(desired, existing),
      null,
      createCollection,
      deleteCollection,
      updateCollection,
      notOursCollection
    );

    reconcileResourceType(
      desiredState.ClusterRoleBindings,
      actualState.ClusterRoleBindings,
      null,
      null,
      createCollection,
      deleteCollection,
      updateCollection,
      notOursCollection
    );

    reconcileResourceType(
      desiredState.ClusterRoles,
      actualState.ClusterRoles,
      (desired, existing) => hasClusterRoleChanged(desired, existing),
      null,
      createCollection,
      deleteCollection,
      updateCollection,
      notOursCollection
    );

    reconcileResourceType(
      desiredState.PodSecurityPolicies,
      actualState.PodSecurityPolicies,
      null,
      null,
      createCollection,
      deleteCollection,
      updateCollection,
      notOursCollection
    );

    reconcileResourceType(
      desiredState.ApiServices,
      actualState.ApiServices,
      null,
      null,
      createCollection,
      deleteCollection,
      updateCollection,
      notOursCollection
    );

    reconcileResourceType(
      desiredState.Alertmanagers,
      actualState.Alertmanagers,
      (desired, existing) => hasAlertManagerChanged(desired, existing),
      null,
      createCollection,
      deleteCollection,
      updateCollection,
      notOursCollection
    );

    reconcileResourceType(
      desiredState.PodMonitors,
      actualState.PodMonitors,
      null,
      null,
      createCollection,
      deleteCollection,
      updateCollection,
      notOursCollection
    );

    reconcileResourceType(
      desiredState.Prometheuses,
      actualState.Prometheuses,
      (desired, existing) => hasPrometheusChanged(desired, existing),
      null,
      createCollection,
      deleteCollection,
      updateCollection,
      notOursCollection
    );

    reconcileResourceType(
      desiredState.PrometheusRules,
      actualState.PrometheusRules,
      (desired, existing) => hasPrometheusRuleChanged(desired, existing),
      null,
      createCollection,
      deleteCollection,
      updateCollection,
      notOursCollection
    );

    reconcileResourceType(
      desiredState.ServiceMonitors,
      actualState.ServiceMonitors,
      (desired, existing) => hasServiceMonitorChanged(desired, existing),
      null,
      createCollection,
      deleteCollection,
      updateCollection,
      notOursCollection
    );

    reconcileResourceType(
      desiredState.Certificates,
      actualState.Certificates,
      (desired, existing) => hasCertificateChanged(desired, existing),
      null,
      createCollection,
      deleteCollection,
      updateCollection,
      notOursCollection
    );

    reconcileResourceType(
      desiredState.CertificateRequests,
      actualState.CertificateRequests,
      null,
      null,
      createCollection,
      deleteCollection,
      updateCollection,
      notOursCollection
    );

    reconcileResourceType(
      desiredState.Challenges,
      actualState.Challenges,
      null,
      null,
      createCollection,
      deleteCollection,
      updateCollection,
      notOursCollection
    );

    reconcileResourceType(
      desiredState.ClusterIssuers,
      actualState.ClusterIssuers,
      null,
      null,
      createCollection,
      deleteCollection,
      updateCollection,
      notOursCollection
    );

    reconcileResourceType(
      desiredState.Issuers,
      actualState.Issuers,
      null,
      null,
      createCollection,
      deleteCollection,
      updateCollection,
      notOursCollection
    );

    reconcileResourceType(
      desiredState.Orders,
      actualState.Orders,
      null,
      null,
      createCollection,
      deleteCollection,
      updateCollection,
      notOursCollection
    );

    reconcileResourceType(
      desiredState.Cortices,
      actualState.Cortices,
      (desired, existing) => hasCortexSpecChanged(desired, existing),
      null,
      createCollection,
      deleteCollection,
      updateCollection,
      notOursCollection
    );

    reconcileResourceType(
      desiredState.Clickhouses,
      actualState.Clickhouses,
      (desired, existing) =>
        hasClickhouseinstallationSpecChanged(desired, existing),
      null,
      createCollection,
      deleteCollection,
      updateCollection,
      notOursCollection
    );

    reconcileResourceType(
      desiredState.Jaegers,
      actualState.Jaegers,
      (desired, existing) => hasJaegerSpecChanged(desired, existing),
      null,
      createCollection,
      deleteCollection,
      updateCollection,
      notOursCollection
    );

    if (notOursCollection.length !== 0) {
      const nowMillis = new Date().getTime();
      if (nowMillis - notOursLastLogMillis >= NOT_OURS_LOG_TTL_MILLIS) {
        // Could log on a single line, but in practice there should only be a few of these at any time
        notOursCollection.forEach(r => {
          log.notice(
            `Leaving existing ${r.constructor.name} ${r.namespace}/${r.name} as-is (missing 'opstrace' annotation)`
          );
        });
        notOursLastLogMillis = nowMillis;
      }
    }

    const toUpdate = addResourcesWithVolumeUpdates(
      reduceCollection(updateCollection),
      desiredState
    );

    // Create a new updateCollection since we've possibly added items to toUpdate with addResourcesWithVolumeUpdates
    const comprehensiveUpdateCollection = entries(toUpdate).reduce<
      K8sResource[]
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    >((acc, [_, resources]) => acc.concat(resources), []);

    yield call(applyRateLimitedApiRequests, createCollection, "create");
    yield call(applyRateLimitedApiRequests, deleteCollection, "delete");
    yield call(
      applyRateLimitedApiRequests,
      comprehensiveUpdateCollection,
      "update"
    );
  } catch (e: any) {
    log.error(`Error in reconcile loop: ${e}`);
  }
}

function reconcileResourceType<T extends K8sResource>(
  desiredResources: T[],
  actualResources: T[],
  customHasChanged: null | ((desired: T, existing: T) => boolean),
  customCanDelete: null | ((resource: T) => boolean),
  createCollection: K8sResource[],
  deleteCollection: K8sResource[],
  updateCollection: K8sResource[],
  notOursCollection: K8sResource[]
) {
  desiredResources.forEach(r => {
    const existing = find(r, actualResources);
    if (!existing) {
      createCollection.push(r);
      return;
    }
    if (!r.isImmutable()) {
      if (
        // Default: In all cases, changing labels means an update should be performed
        haveLabelsChanged(r, existing) ||
        // Custom: Additional type-specific checks for detecting changes
        (customHasChanged != null && customHasChanged(r, existing))
      ) {
        // If the resource has had its opstrace annotation removed, do not modify it.
        // This allows us to manually make changes to resources without the controller stepping on them.
        if (existing.isOurs()) {
          updateCollection.push(r);
        } else {
          notOursCollection.push(existing);
        }
      }
    }
  });
  actualResources.forEach(r => {
    const isDesired = find(r, desiredResources);
    if (
      // Default: Only delete things that are owned by us and aren't special in some way
      (!isDesired &&
        r.isOurs() &&
        !r.isTerminating() &&
        !r.isProtected() &&
        !r.isImmutable()) ||
      // Custom: In certain circumstances, some types should be deleted even if not owned by us
      (customCanDelete != null && customCanDelete(r))
    ) {
      deleteCollection.push(r);
    }
  });
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
