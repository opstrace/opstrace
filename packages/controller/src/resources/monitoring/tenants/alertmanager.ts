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
import { State } from "../../../reducer";
import { Tenant } from "@opstrace/tenants";
import {
  getTenantNamespace
} from "../../../helpers";
import {
  ResourceCollection,
  Service,
} from "@opstrace/kubernetes";

export function AlertManagerResources(
  state: State,
  kubeConfig: KubeConfig,
  tenant: Tenant
): ResourceCollection {
  const collection = new ResourceCollection();

  const namespace = getTenantNamespace(tenant);

  // Points to the multitenant Cortex Alertmanager.
  // This allows the Ingress at "<tenant>.<cluster>.opstrace.io/alertmanager" to route to Cortex.
  // Requests must include an "X-Scope-OrgID" header to identify the tenant, this is handled at the Ingress.
  collection.add(
    new Service(
      {
        apiVersion: "v1",
        kind: "Service",
        metadata: {
          name: "cortex-alertmanager",
          namespace
        },
        spec: {
          type: "ExternalName",
          externalName: "alertmanager.cortex.svc.cluster.local"
        }
      },
      kubeConfig
    )
  );

  return collection;
}
