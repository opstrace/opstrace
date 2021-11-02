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
import {
  Ingress,
  Namespace,
  ResourceCollection,
  V1CertificateResource
} from "@opstrace/kubernetes";
import {
  getControllerConfig,
  getDomain,
  getTenantDomain,
  getTenantNamespace
} from "../../helpers";
import { State } from "../../reducer";
import { CertManagerResources } from "./certManager";
import { ExternalDnsResources } from "./externalDns";
import { NginxIngressResources } from "./nginxIngress";

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
  collection.add(ExternalDnsResources(state, kubeConfig, namespace));
  collection.add(NginxIngressResources(state, kubeConfig, namespace));

  const domain = getDomain(state);

  const { tlsCertificateIssuer } = getControllerConfig(state);

  state.tenants.list.tenants.forEach(tenant => {
    const tenantHost = getTenantDomain(tenant, state);
    const tenantNamespace = getTenantNamespace(tenant);

    // Creates an 'https-cert' Secret for the tenant's ingresses
    collection.add(
      new V1CertificateResource(
        {
          apiVersion: "cert-manager.io/v1",
          kind: "Certificate",
          metadata: {
            name: "https-cert",
            namespace: tenantNamespace
          },
          spec: {
            secretName: "https-cert",
            dnsNames: [tenantHost, `*.${tenantHost}`],
            issuerRef: {
              name: tlsCertificateIssuer,
              kind: "ClusterIssuer"
            }
          }
        },
        kubeConfig
      )
    );

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
              "nginx.ingress.kubernetes.io/auth-url": `https://${domain}/_/auth/nginx-ingress/webhook`,
              "nginx.ingress.kubernetes.io/auth-signin": `https://${domain}/login?rd=${encodeURIComponent(
                "https://"
              )}${encodeURIComponent(tenantHost)}$escaped_request_uri`,
              "nginx.ingress.kubernetes.io/auth-response-headers":
                "X-Auth-Request-User, X-Auth-Request-Email",
              // Include an X-Scope-OrgID header containing the tenant name in all requests.
              // This is (only) used by cortex-* services to identify the tenant.
              // WARNING: Don't forget the trailing semicolon or else routes will silently fail.
              "nginx.ingress.kubernetes.io/configuration-snippet": ` more_set_input_headers "X-Scope-OrgID: ${tenant.name}";`,
              "nginx.ingress.kubernetes.io/cors-allow-credentials": "true",
              "nginx.ingress.kubernetes.io/cors-allow-methods":
                "GET, OPTIONS, PUT, POST, DELETE",
              "nginx.ingress.kubernetes.io/cors-allow-origin": `https://${domain}`,
              "nginx.ingress.kubernetes.io/enable-cors": "true"
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
                      path: "/prometheus",
                      pathType: "Prefix",
                      backend: {
                        serviceName: "prometheus",
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        servicePort: 9090 as any
                      }
                    },
                    // An ExternalName service which points to alertmanager in the 'cortex' namespace.
                    // Our requests to this service must include the X-Scope-OrgID header for Cortex.
                    {
                      path: "/alertmanager",
                      pathType: "Prefix",
                      backend: {
                        serviceName: "cortex-alertmanager",
                        // Cortex alertmanager has ports 80 and 9094. The UI is served at port 80.
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        servicePort: 80 as any
                      }
                    },
                    {
                      path: "/grafana",
                      pathType: "Prefix",
                      backend: {
                        serviceName: "grafana",
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        servicePort: 3000 as any
                      }
                    },
                    {
                      path: "/jaeger",
                      pathType: "Prefix",
                      backend: {
                        serviceName: "jaeger",
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        servicePort: "ui" as any
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
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
