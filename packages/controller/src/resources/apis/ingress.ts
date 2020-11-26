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

import { Ingress, ResourceCollection } from "@opstrace/kubernetes";
import { KubeConfig } from "@kubernetes/client-node";
import { State } from "../../reducer";
import { Tenant } from "@opstrace/tenants";
import { getExternalApiDomain } from "../../helpers";

export const addApiIngress = ({
  serviceName,
  namespace,
  tenant,
  api,
  issuer,
  kubeConfig,
  state,
  collection
}: {
  serviceName: string;
  namespace: string;
  tenant: Tenant;
  api: string;
  issuer: string;
  kubeConfig: KubeConfig;
  state: State;
  collection: ResourceCollection;
}) => {
  const externalApiHost = getExternalApiDomain(api, tenant, state);

  // Add ingress for external API
  collection.add(
    new Ingress(
      {
        apiVersion: "networking.k8s.io/v1beta1",
        kind: "Ingress",
        metadata: {
          name: `${api}-apiexternal`,
          namespace,
          annotations: {
            "kubernetes.io/ingress.class": "apiexternal",
            "external-dns.alpha.kubernetes.io/ttl": "30",
            "nginx.ingress.kubernetes.io/client-body-buffer-size": "10m"
          }
        },
        spec: {
          tls: [
            {
              hosts: [externalApiHost],
              secretName: "https-cert"
            }
          ],
          rules: [
            {
              host: externalApiHost,
              http: {
                paths: [
                  {
                    backend: {
                      serviceName,
                      servicePort: 8080 as any
                    },
                    pathType: "ImplementationSpecific",
                    path: "/"
                  }
                ]
              }
            }
          ]
        }
      },
      kubeConfig
    )
  );
};
