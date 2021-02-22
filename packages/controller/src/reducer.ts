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

import { combineReducers } from "redux";

import { reducer as tenantReducer } from "@opstrace/tenants";
import { reducer as configReducer } from "@opstrace/controller-config";

import {
  storageClassesReducer,
  nodesReducer,
  persistentVolumesReducer,
  persistentVolumeClaimsReducer,
  statefulSetsReducer,
  serviceAccountsReducer,
  servicesReducer,
  secretsReducer,
  roleBindingsReducer,
  rolesReducer,
  namespacesReducer,
  deploymentsReducer,
  daemonSetsReducer,
  crdsReducer,
  configMapsReducer,
  clusterRoleBindingsReducer,
  clusterRolesReducer,
  apiServicesReducer,
  ingressesReducer,
  podSecurityPoliciesReducer,
  V1AlertmanagerReducer,
  V1PodmonitorReducer,
  V1PrometheusReducer,
  V1PrometheusruleReducer,
  V1ServicemonitorReducer,
  V1CertificateReducer,
  V1CertificaterequestReducer,
  V1ChallengeReducer,
  V1ClusterissuerReducer,
  V1IssuerReducer,
  V1OrderReducer
} from "@opstrace/kubernetes";

import {
  credentials,
  exporters
} from "./reducers/graphql";

export const rootReducers = {
  tenants: tenantReducer,
  config: configReducer,
  kubernetes: combineReducers({
    cluster: combineReducers({
      Nodes: nodesReducer,
      Ingresses: ingressesReducer,
      StorageClasses: storageClassesReducer,
      PersistentVolumes: persistentVolumesReducer,
      PersistentVolumeClaims: persistentVolumeClaimsReducer,
      StatefulSets: statefulSetsReducer,
      ServiceAccounts: serviceAccountsReducer,
      Services: servicesReducer,
      Secrets: secretsReducer,
      RoleBindings: roleBindingsReducer,
      Roles: rolesReducer,
      Namespaces: namespacesReducer,
      Deployments: deploymentsReducer,
      DaemonSets: daemonSetsReducer,
      CustomResourceDefinitions: crdsReducer,
      ConfigMaps: configMapsReducer,
      ClusterRoleBindings: clusterRoleBindingsReducer,
      ClusterRoles: clusterRolesReducer,
      PodSecurityPolicies: podSecurityPoliciesReducer,
      ApiServices: apiServicesReducer,
      Alertmanagers: V1AlertmanagerReducer,
      PodMonitors: V1PodmonitorReducer,
      Prometheuses: V1PrometheusReducer,
      PrometheusRules: V1PrometheusruleReducer,
      ServiceMonitors: V1ServicemonitorReducer,
      Certificates: V1CertificateReducer,
      CertificateRequests: V1CertificaterequestReducer,
      Challenges: V1ChallengeReducer,
      ClusterIssuers: V1ClusterissuerReducer,
      Issuers: V1IssuerReducer,
      Orders: V1OrderReducer
    })
  }),
  graphql: combineReducers({
    Credentials: credentials.reducer,
    Exporters: exporters.reducer
  }),
};

export const rootReducer = combineReducers(rootReducers);
export type State = ReturnType<typeof rootReducer>;
