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

import { KubeConfig } from "@kubernetes/client-node";
import { ResourceCollection, Namespace } from "@opstrace/kubernetes";
import { GrafanaResources } from "./tenants/grafana";
import { AlertManagerResources } from "./tenants/alertmanager";
import { PrometheusOperatorResources } from "./prometheusOperator";
import { PrometheusResources } from "./tenants/prometheus";
import { State } from "../../reducer";

import { SystemMonitoringResources } from "./system";

export function MonitoringResources(
  state: State,
  kubeConfig: KubeConfig,
  namespace: string
): ResourceCollection {
  const collection = new ResourceCollection();

  collection.add(
    new Namespace(
      {
        apiVersion: "v1",
        kind: "Namespace",
        metadata: {
          name: namespace
        }
      },
      kubeConfig
    )
  );

  // Per tenant resources
  state.tenants.list.tenants.forEach(tenant => {
    // Each tenant gets Alertmanager, Prometheus, Grafana
    collection.add(AlertManagerResources(state, kubeConfig, tenant));
    collection.add(GrafanaResources(state, kubeConfig, tenant));
    collection.add(PrometheusResources(state, kubeConfig, tenant));

    // SYSTEM is special. It's where we monitor the opstrace system.
    if (tenant.type === "SYSTEM") {
      collection.add(SystemMonitoringResources(state, kubeConfig, tenant));
    }
  });
  // Operator resources
  collection.add(PrometheusOperatorResources(state, kubeConfig, namespace));

  return collection;
}
