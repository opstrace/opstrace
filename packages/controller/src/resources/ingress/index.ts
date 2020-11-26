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
import { ResourceCollection, Namespace, Ingress } from "@opstrace/kubernetes";
import { getTenantDomain, getTenantNamespace } from "../../helpers";
import { State } from "../../reducer";
import { CertManagerResources } from "./certManager";
import { KubedResources } from "./kubed";
import { ExternalDnsResources } from "./externalDns";
import { NginxIngressResources } from "./nginxIngress";
import { Oauth2Resources } from "./oauth2";

export function IngressResources(
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
          name: namespace,
          labels: {
            "app.kubernetes.io/name": "ingress-nginx",
            "app.kubernetes.io/part-of": "ingress-nginx",
            "cert-manager.io/disable-validation": "true"
          }
        }
      },
      kubeConfig
    )
  );

  collection.add(CertManagerResources(state, kubeConfig, namespace));
  collection.add(KubedResources(state, kubeConfig, namespace));
  collection.add(ExternalDnsResources(state, kubeConfig, namespace));
  collection.add(NginxIngressResources(state, kubeConfig, namespace));
  collection.add(Oauth2Resources(state, kubeConfig));

  state.tenants.list.tenants.forEach(tenant => {
    const tenantHost = getTenantDomain(tenant, state);
    const tenantNamespace = getTenantNamespace(tenant);

    collection.add(
      new Ingress(
        {
          apiVersion: "networking.k8s.io/v1beta1",
          kind: "Ingress",
          metadata: {
            name: `${tenant.name}-ingress`,
            namespace: tenantNamespace,
            annotations: {
              "kubernetes.io/ingress.class": "ui",
              "external-dns.alpha.kubernetes.io/ttl": "30",
              "nginx.ingress.kubernetes.io/auth-url": `https://${tenantHost}/oauth2/auth`,
              "nginx.ingress.kubernetes.io/auth-signin": `https://${tenantHost}/oauth2/start?rd=$escaped_request_uri`,
              "nginx.ingress.kubernetes.io/auth-response-headers":
                "X-Auth-Request-User, X-Auth-Request-Email"
            }
          },
          spec: {
            tls: [
              {
                hosts: [tenantHost],
                secretName: "https-cert"
              }
            ],
            rules: [
              {
                host: tenantHost,
                http: {
                  paths: [
                    {
                      path: "/prometheus/",
                      pathType: "ImplementationSpecific",
                      backend: {
                        serviceName: "prometheus",
                        servicePort: 9090 as any
                      }
                    },
                    {
                      path: "/alertmanager/",
                      pathType: "ImplementationSpecific",
                      backend: {
                        serviceName: "alertmanager",
                        servicePort: 9093 as any
                      }
                    },
                    {
                      path: "/grafana/",
                      pathType: "ImplementationSpecific",
                      backend: {
                        serviceName: "grafana",
                        servicePort: 3000 as any
                      }
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

    // Add a rewrite for now since we don't serve anything at the root
    collection.add(
      new Ingress(
        {
          apiVersion: "networking.k8s.io/v1beta1",
          kind: "Ingress",
          metadata: {
            name: `${tenant.name}-ingress-root-redirect`,
            namespace: tenantNamespace,
            annotations: {
              "kubernetes.io/ingress.class": "ui",
              "external-dns.alpha.kubernetes.io/ttl": "30",
              "nginx.ingress.kubernetes.io/rewrite-target": "/grafana"
            }
          },
          spec: {
            tls: [
              {
                hosts: [tenantHost],
                secretName: "https-cert"
              }
            ],
            rules: [
              {
                host: tenantHost,
                http: {
                  paths: [
                    {
                      path: "/",
                      pathType: "ImplementationSpecific",
                      backend: {
                        // This is skipped because we rewrite
                        serviceName: "grafana",
                        servicePort: 3000 as any
                      }
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
  });

  return collection;
}
