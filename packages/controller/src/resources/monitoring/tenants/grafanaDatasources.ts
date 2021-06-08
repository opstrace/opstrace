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

import { ResourceCollection, Secret } from "@opstrace/kubernetes";
import { State } from "../../../reducer";
import { Tenant } from "@opstrace/tenants";
import { getTenantNamespace } from "../../../helpers";
import { KubeConfig } from "@kubernetes/client-node";

export function GrafanaDatasourceResources(
  state: State,
  kubeConfig: KubeConfig,
  tenant: Tenant
): ResourceCollection {
  const collection = new ResourceCollection();

  // The `jsonData` and `secureJsonData` dance below does not actually encode
  // sensitive data, but is a bit of a magical way to define "Custom HTTP
  // headers for datasources" where the proxy (running as part of the Grafana
  // "web app", note `access: "proxy"` above) is now supposed to set the
  // `X-Scope-OrgID` header. The goal is to access loki / cortex directly, and
  // when doing so this header needs to be set. Also see
  // opstrace-prelaunch/issues/1614

  const datasources = {
    apiVersion: 1,
    datasources: [
      {
        access: "proxy",
        editable: false,
        name: "metrics",
        orgId: 1,
        type: "prometheus",
        url: "http://query-frontend.cortex.svc.cluster.local",
        version: 1,
        jsonData: {
          httpHeaderName1: "HeaderName",
          httpHeaderName2: "X-Scope-OrgID"
        },
        secureJsonData: {
          httpHeaderValue1: "HeaderValue",
          httpHeaderValue2: `${tenant.name}`
        }
      },
      {
        name: "logs",
        editable: false,
        type: "loki",
        orgId: 1,
        url: "http://querier.loki.svc.cluster.local:1080",
        access: "proxy",
        version: 1,
        jsonData: {
          httpHeaderName1: "HeaderName",
          httpHeaderName2: "X-Scope-OrgID"
        },
        secureJsonData: {
          httpHeaderValue1: "HeaderValue",
          httpHeaderValue2: `${tenant.name}`
        }
      }
    ]
  };

  collection.add(
    new Secret(
      {
        apiVersion: "v1",
        data: {
          "datasources.yaml": Buffer.from(JSON.stringify(datasources)).toString(
            "base64"
          )
        },
        kind: "Secret",
        metadata: {
          name: "grafana-datasources",
          namespace: getTenantNamespace(tenant)
        },
        type: "Opaque"
      },
      kubeConfig
    )
  );

  return collection;
}
