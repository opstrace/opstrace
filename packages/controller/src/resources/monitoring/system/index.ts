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
  ResourceCollection,
  ClusterRole,
  ClusterRoleBinding,
  Role,
  RoleBinding
} from "@opstrace/kubernetes";
import { getTenantNamespace, getPrometheusName } from "../../../helpers";
import { State } from "../../../reducer";
import { Tenant } from "@opstrace/tenants";

import { KubeConfig } from "@kubernetes/client-node";

import { KubeStateMetricsResources } from "./kubeStateMetrics";
import { NodeExporterResources } from "./nodeExporter";
import { PrometheusAdaptorResources } from "./prometheusAdaptor";
import { KubeServiceMonitorResources } from "./kubeServiceMonitors";

export function SystemMonitoringResources(
  state: State,
  kubeConfig: KubeConfig,
  tenant: Tenant
): ResourceCollection {
  const collection = new ResourceCollection();

  const namespace = getTenantNamespace(tenant);
  const prometheusName = getPrometheusName(tenant);

  collection.add(PrometheusAdaptorResources(state, kubeConfig, namespace));
  collection.add(KubeStateMetricsResources(state, kubeConfig, namespace));
  collection.add(NodeExporterResources(state, kubeConfig, namespace));
  collection.add(KubeServiceMonitorResources(state, kubeConfig, namespace));

  /**
   * Namespaces that need monitoring
   */
  state.kubernetes.cluster.Namespaces.resources.forEach(ns => {
    collection.add(
      new Role(
        {
          apiVersion: "rbac.authorization.k8s.io/v1",
          kind: "Role",
          metadata: {
            name: prometheusName,
            namespace: ns.name
          },
          rules: [
            {
              apiGroups: [""],
              resources: ["services", "endpoints", "pods"],
              verbs: ["get", "list", "watch"]
            }
          ]
        },
        kubeConfig
      )
    );
    collection.add(
      new RoleBinding(
        {
          apiVersion: "rbac.authorization.k8s.io/v1",
          kind: "RoleBinding",
          metadata: {
            name: prometheusName,
            namespace: ns.name
          },
          roleRef: {
            apiGroup: "rbac.authorization.k8s.io",
            kind: "Role",
            name: prometheusName
          },
          subjects: [
            {
              kind: "ServiceAccount",
              name: prometheusName,
              namespace
            }
          ]
        },
        kubeConfig
      )
    );
  });

  collection.add(
    new RoleBinding(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "RoleBinding",
        metadata: {
          name: "system-prometheus-config",
          namespace
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "Role",
          name: "system-prometheus-config"
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: prometheusName,
            namespace
          }
        ]
      },
      kubeConfig
    )
  );

  collection.add(
    new ClusterRole(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "ClusterRole",
        metadata: {
          name: prometheusName
        },
        rules: [
          {
            apiGroups: [""],
            resources: ["nodes/metrics"],
            verbs: ["get"]
          },
          {
            nonResourceURLs: ["/metrics"],
            verbs: ["get"]
          }
        ]
      },
      kubeConfig
    )
  );

  collection.add(
    new ClusterRoleBinding(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "ClusterRoleBinding",
        metadata: {
          name: prometheusName
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "ClusterRole",
          name: prometheusName
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: prometheusName,
            namespace
          }
        ]
      },
      kubeConfig
    )
  );

  collection.add(
    new Role(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "Role",
        metadata: {
          name: "system-prometheus-config",
          namespace
        },
        rules: [
          {
            apiGroups: [""],
            resources: ["configmaps"],
            verbs: ["get"]
          }
        ]
      },
      kubeConfig
    )
  );

  return collection;
}
