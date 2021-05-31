/**
 * Copyright 2021 Opstrace, Inc.
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

import { KubeConfig, V1Secret } from "@kubernetes/client-node";
import { Secret, SecretState } from "@opstrace/kubernetes";
import { Tenant } from "@opstrace/tenants";
import { TenantsState } from "@opstrace/tenants/src/reducer/tenants";
import { TenantResources } from ".";
import { State } from "../../reducer";

jest.mock("@opstrace/kubernetes");

type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

const generateTenantState = (
  config: Partial<TenantsState> = {}
): TenantsState => ({
  tenants: [],
  loading: false,
  backendExists: null,
  error: null,
  ...config
});

const generateKubernetesState = (
  config: Partial<SecretState> = {}
): SecretState => ({
  resources: [],
  loaded: false,
  error: null,
  ...config
});

const generateSourceSecret = (
  kubeConfig: KubeConfig,
  secretConfig: Partial<V1Secret> = {}
): Secret =>
  new Secret(
    {
      apiVersion: "v1",
      data: {
        "ca.crt": "my-ca.crt",
        "tls.crt": "my-tls.crt",
        "tls.key": "my-tls.key"
      },
      kind: "Secret",
      metadata: {
        name: "https-cert",
        namespace: "ingress"
      },
      type: "kubernetes.io/tls",
      ...secretConfig
    },
    kubeConfig
  );

describe("TenantResources", () => {
  it("should create copy of cert secret", () => {
    const kubeConfig = new KubeConfig();

    const sourceSecret = generateSourceSecret(kubeConfig, {
      metadata: {
        name: "my-cert-secret",
        namespace: "my-cert-namespace"
      }
    });
    const tenant: Tenant = {
      name: "my-tenant",
      type: "USER"
    };
    const state: DeepPartial<State> = {
      tenants: {
        list: generateTenantState({ tenants: [tenant] })
      },
      kubernetes: {
        cluster: {
          Secrets: generateKubernetesState({
            resources: [sourceSecret]
          })
        }
      }
    };

    const resources = TenantResources(
      state as State,
      kubeConfig,
      sourceSecret.namespace,
      sourceSecret.name
    );

    expect(resources).toBeTruthy();
  });
});
