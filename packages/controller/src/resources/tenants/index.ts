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
import { State } from "../../reducer";
import { getTenantNamespace } from "../../helpers";

export function TenantResources(
  state: State,
  kubeConfig: KubeConfig
): ResourceCollection {
  const collection = new ResourceCollection();

  state.tenants.list.tenants.forEach(tenant => {
    const tenantNamespace = getTenantNamespace(tenant);
    collection.add(
      new Namespace(
        {
          apiVersion: "v1",
          kind: "Namespace",
          metadata: {
            name: tenantNamespace,
            labels: {
              tenant: tenant.name,
              "cert-manager.io/disable-validation": "true"
            }
          }
        },
        kubeConfig
      )
    );
  });
  return collection;
}
