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
  ResourceCollection,
  Deployment,
  ClusterRoleBinding,
  ServiceAccount,
  Namespace,
  Ingress,
  Service
} from "@opstrace/kubernetes";
import { KubeConfig } from "@kubernetes/client-node";
import { State } from "../../reducer";
import { getDomain } from "../../helpers";

export function OpstraceApplicationResources(
  state: State,
  kubeConfig: KubeConfig,
  namespace: string
): ResourceCollection {
  const collection = new ResourceCollection();

  const applicationImage = state.config.config?.applicationImage;
  if (!applicationImage) {
    throw Error("we do not have an applicationImage specified");
  }
  const domain = getDomain(state);

  collection.add(
    new Namespace(
      {
        apiVersion: "v1",
        kind: "Namespace",
        metadata: {
          name: namespace,
          labels: {
            // although this isn't actually a "tenant", we use this label to trick
            // kubed into thinking it's a tenant so that the certificates are copied into
            // this namespace too.
            tenant: "opstrace-application",
            "cert-manager.io/disable-validation": "true"
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
          name: "opstrace-application",
          namespace,
          annotations: {
            "kubernetes.io/ingress.class": "ui",
            "external-dns.alpha.kubernetes.io/ttl": "30",
            "nginx.ingress.kubernetes.io/client-body-buffer-size": "10m"
          }
        },
        spec: {
          tls: [
            {
              hosts: [domain],
              secretName: "https-cert"
            }
          ],
          rules: [
            {
              host: domain,
              http: {
                paths: [
                  {
                    backend: {
                      serviceName: "opstrace-application",
                      servicePort: 3001 as any
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

  collection.add(
    new Service(
      {
        apiVersion: "v1",
        kind: "Service",
        metadata: {
          name: "opstrace-application",
          labels: {
            "k8s-app": "opstrace-application"
          },
          namespace
        },
        spec: {
          ports: [
            {
              name: "http",
              port: 3001,
              protocol: "TCP",
              targetPort: 3001 as any
            }
          ],
          selector: {
            "k8s-app": "opstrace-application"
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
          name: "opstrace-application",
          namespace,
          labels: {
            "k8s-app": "opstrace-application"
          }
        },
        spec: {
          replicas: 1,
          strategy: {
            type: "Recreate"
          },
          selector: {
            matchLabels: {
              name: "opstrace-application"
            }
          },
          template: {
            metadata: {
              labels: {
                name: "opstrace-application"
              }
            },
            spec: {
              serviceAccountName: "opstrace-application",
              containers: [
                {
                  name: "opstrace-application",
                  image: applicationImage,
                  imagePullPolicy: "Always",
                  command: ["node", "server.js"],
                  env: [
                    { name: "GRAPHQL_ENDPOINT_HOST", value: "localhost" },
                    { name: "GRAPHQL_ENDPOINT_PORT", value: "8080" },
                    {
                      name: "GRAPHQL_ENDPOINT",
                      value: "http://localhost:8080/v1/graphql"
                    },
                    {
                      name: "HASURA_GRAPHQL_ADMIN_SECRET",
                      value: "myadminsecret"
                    },
                    {
                      name: "AUTH0_CLIENT_ID",
                      value: "vs6bgTunbVK4dvdLRj02DptWjOmAVWVM"
                    },
                    {
                      name: "AUTH0_DOMAIN",
                      value: "opstrace-dev.us.auth0.com"
                    },
                    { name: "HASURA_ADMIN_SECRET", value: "myadminsecret" },
                    { name: "DOMAIN", value: "http://localhost:3001" },
                    { name: "UI_DOMAIN", value: "http://localhost:3000" },
                    {
                      name: "COOKIE_SECRET",
                      value:
                        "aef23610b381f01bf2325f012324a42c2e3e85b12ac37492e07fa98df00cdd20"
                    }
                  ],
                  resources: {
                    limits: {
                      cpu: "1",
                      memory: "1Gi"
                    },
                    requests: {
                      cpu: "0.5",
                      memory: "500Mi"
                    }
                  }
                }
              ]
            }
          }
        }
      },
      kubeConfig
    )
  );

  collection.add(
    new ServiceAccount(
      {
        apiVersion: "v1",
        kind: "ServiceAccount",
        metadata: {
          name: "opstrace-application",
          namespace
        }
      },
      kubeConfig
    )
  );

  collection.add(
    new ClusterRoleBinding(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "ClusterRoleBinding",
        metadata: {
          name: "opstrace-application-clusteradmin-binding"
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "ClusterRole",
          name: "cluster-admin"
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: "opstrace-application",
            namespace
          }
        ]
      },
      kubeConfig
    )
  );

  return collection;
}
