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
  Ingress
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

  const version = state.config.config?.version;
  if (!version) {
    throw Error(
      "we do not have a version specified for controller resources 'state.config.config?.version'"
    );
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
                  image: `opstrace/app:${version}`,
                  imagePullPolicy: "Always",
                  command: ["node", "--prof", "./cmd.js"],
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
