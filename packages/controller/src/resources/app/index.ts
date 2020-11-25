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
  Service,
  Secret
} from "@opstrace/kubernetes";
import { KubeConfig } from "@kubernetes/client-node";
import { State } from "../../reducer";
import { getDomain, generateSecretValue } from "../../helpers";

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
            app: "opstrace-application"
          },
          namespace
        },
        spec: {
          ports: [
            {
              name: "http",
              port: 3001,
              targetPort: "http" as any
            }
          ],
          selector: {
            app: "opstrace-application"
          }
        }
      },
      kubeConfig
    )
  );

  const sessionCookieSecret = new Secret(
    {
      apiVersion: "v1",
      data: {
        COOKIE_SECRET: generateSecretValue()
      },
      kind: "Secret",
      metadata: {
        name: "session-cookie-secret",
        namespace: namespace
      },
      type: "Opaque"
    },
    kubeConfig
  );
  // We don't want this value to change once it exists.
  // This value changing would cause all sessions to be invalidated immediately
  // and that would be a bad experience during an upgrade.
  // This value of this secret can always be updated manually if instant session invalidation is desired.
  sessionCookieSecret.setShouldNeverUpdate();

  collection.add(sessionCookieSecret);

  const hasuraAdminSecret = new Secret(
    {
      apiVersion: "v1",
      data: {
        HASURA_ADMIN_SECRET: generateSecretValue()
      },
      kind: "Secret",
      metadata: {
        name: "hasura-admin-secret",
        namespace: namespace
      },
      type: "Opaque"
    },
    kubeConfig
  );
  // We don't want this value to change once it exists either.
  // The value of this secret can always be updated manually in the cluster if needs be for security purposes.
  hasuraAdminSecret.setShouldNeverUpdate();

  collection.add(hasuraAdminSecret);

  collection.add(
    new Deployment(
      {
        apiVersion: "apps/v1",
        kind: "Deployment",
        metadata: {
          name: "opstrace-application",
          namespace,
          labels: {
            app: "opstrace-application"
          }
        },
        spec: {
          replicas: 1,
          strategy: {
            type: "Recreate"
          },
          selector: {
            matchLabels: {
              app: "opstrace-application"
            }
          },
          template: {
            metadata: {
              labels: {
                app: "opstrace-application"
              }
            },
            spec: {
              serviceAccountName: "opstrace-application",
              containers: [
                {
                  name: "opstrace-application",
                  image: applicationImage,
                  imagePullPolicy: "Always",
                  command: ["node", "dist/server.js"],
                  env: [
                    {
                      name: "GRAPHQL_ENDPOINT_HOST",
                      value: `graphql.${namespace}.svc.cluster.local`
                    },
                    { name: "GRAPHQL_ENDPOINT_PORT", value: "8080" },
                    {
                      name: "GRAPHQL_ENDPOINT",
                      value: `graphql.${namespace}.svc.cluster.local:8080/v1/graphql`
                    },
                    {
                      name: "AUTH0_CLIENT_ID",
                      value: "vs6bgTunbVK4dvdLRj02DptWjOmAVWVM"
                    },
                    {
                      name: "AUTH0_DOMAIN",
                      value: "opstrace-dev.us.auth0.com"
                    },
                    { name: "DOMAIN", value: domain },
                    { name: "UI_DOMAIN", value: domain },
                    {
                      name: "COOKIE_SECRET",
                      valueFrom: {
                        secretKeyRef: {
                          name: "session-cookie-secret",
                          key: "COOKIE_SECRET"
                        }
                      }
                    },
                    {
                      name: "HASURA_GRAPHQL_ADMIN_SECRET",
                      valueFrom: {
                        secretKeyRef: {
                          name: "hasura-admin-secret",
                          key: "HASURA_ADMIN_SECRET"
                        }
                      }
                    }
                  ],
                  ports: [
                    {
                      containerPort: 3001,
                      name: "http"
                    }
                  ],
                  resources: {}
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
