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
  ResourceCollection,
  Deployment,
  Service,
  Ingress,
  withPodAntiAffinityRequired
} from "@opstrace/kubernetes";
import { State } from "../../reducer";
import {
  getTenantDomain,
  getTenantNamespace,
  getControllerConfig
} from "../../helpers";
import { DockerImages } from "@opstrace/controller-config";

export function Oauth2Resources(
  state: State,
  kubeConfig: KubeConfig
): ResourceCollection {
  const collection = new ResourceCollection();
  const {
    oidcClientId,
    oidcClientSecret,
    authenticationCookie
  } = getControllerConfig(state);

  state.tenants.list.tenants.forEach(tenant => {
    const tenantHost = getTenantDomain(tenant, state);
    const tenantNamespace = getTenantNamespace(tenant);

    collection.add(
      new Ingress(
        {
          apiVersion: "networking.k8s.io/v1beta1",
          kind: "Ingress",
          metadata: {
            name: `${tenant.name}-ingress-auth`,
            namespace: tenantNamespace,
            annotations: {
              "kubernetes.io/ingress.class": "ui",
              "external-dns.alpha.kubernetes.io/ttl": "30"
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
                      backend: {
                        serviceName: "oauth2-proxy",
                        servicePort: 4180 as any
                      },
                      pathType: "ImplementationSpecific",
                      path: "/oauth2"
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

    collection.add(
      new Service(
        {
          apiVersion: "v1",
          kind: "Service",
          metadata: {
            labels: {
              "k8s-app": "oauth2-proxy"
            },
            name: "oauth2-proxy",
            namespace: tenantNamespace
          },
          spec: {
            ports: [
              {
                name: "http",
                port: 4180,
                protocol: "TCP",
                targetPort: 4180 as any
              }
            ],
            selector: {
              "k8s-app": "oauth2-proxy"
            }
          }
        },
        kubeConfig
      )
    );

    collection.add(
      new Deployment(
        {
          apiVersion: "apps/v1",
          kind: "Deployment",
          metadata: {
            labels: {
              "k8s-app": "oauth2-proxy"
            },
            name: "oauth2-proxy",
            namespace: tenantNamespace
          },
          spec: {
            replicas: 2,
            selector: {
              matchLabels: {
                "k8s-app": "oauth2-proxy"
              }
            },
            template: {
              metadata: {
                labels: {
                  "k8s-app": "oauth2-proxy"
                }
              },
              spec: {
                affinity: withPodAntiAffinityRequired({
                  "k8s-app": "oauth2-proxy"
                }),
                containers: [
                  {
                    args: [
                      `--provider=google`,
                      `--client-id=${oidcClientId}`,
                      `--client-secret=${oidcClientSecret}`,
                      `--email-domain=*`,
                      "--upstream=file:///dev/null",
                      "--http-address=0.0.0.0:4180",
                      "--set-xauthrequest" // Set X-Auth-Request-User and X-Auth-Request-Email response headers
                    ],
                    env: [
                      {
                        name: "OAUTH2_PROXY_COOKIE_SECRET",
                        value: authenticationCookie
                      }
                    ],
                    image: DockerImages.oauth2Proxy,
                    imagePullPolicy: "IfNotPresent",
                    name: "oauth2-proxy",
                    ports: [
                      {
                        containerPort: 4180,
                        protocol: "TCP"
                      }
                    ]
                  }
                ]
              }
            }
          }
        },
        kubeConfig
      )
    );
  });

  return collection;
}
