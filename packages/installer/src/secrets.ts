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
  KubeConfiguration,
  Namespace,
  ResourceCollection,
  Secret,
  kubernetesError
} from "@opstrace/kubernetes";

import { log } from "@opstrace/utils";

/**
 * Create a secret in the system tenant's k8s namespace, carrying
 * long-lived authentication proof for the systemlog pusher (fluentd) to
 * present towards the Tenant API authenticator.
 */
export async function storeSystemTenantApiAuthTokenAsSecret(
  authToken: string,
  kubeConfig: KubeConfiguration
): Promise<void> {
  // Use ResourceCollection to ensure that the created resources are annotated correctly
  const collection = new ResourceCollection();

  collection.add(new Namespace(
    {
      apiVersion: "v1",
      kind: "Namespace",
      metadata: {
        name: "system-tenant",
        labels: {
          tenant: "system-tenant",
          "cert-manager.io/disable-validation": "true"
        }
      }
    },
    kubeConfig
  ));

  // to be consumed by both, systemlog-fluentd as well as system
  // prometheus.
  const s = new Secret(
    {
      metadata: {
        name: "system-tenant-api-auth-token",
        namespace: "system-tenant"
      },
      stringData: {
        system_tenant_api_auth_token: authToken
      }
    },
    kubeConfig
  );
  // this secret is only configured here and isn't listed in the controller-managed assets,
  // so we must mark it immutable to ensure it isn't deleted by the controller later
  s.setImmutable();
  collection.add(s);

  // use for instead of forEach: allow await inside
  for (const r of collection.get()) {
    try {
      log.info(`Try to create ${r.constructor.name}: ${r.namespace}/${r.name}`);
      await r.create();
    } catch (e) {
      const err = kubernetesError(e);
      if (err.statusCode === 409) {
        log.info("already exists");
      } else {
        throw e;
      }
    }
  }
}
