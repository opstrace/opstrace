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

import {
  Deployment,
  Ingress,
  ResourceCollection,
  Service,
  V1ServicemonitorResource,
  withPodAntiAffinityRequired
} from "@opstrace/kubernetes";
import { State } from "../../reducer";
import { KubeConfig, V1EnvVar } from "@kubernetes/client-node";
import {
  getControllerConfig,
  getDomain
} from "../../helpers";
import {
  DockerImages,
  ControllerConfigType
} from "@opstrace/controller-config";

export function ConfigAPIResources(
  state: State,
  kubeConfig: KubeConfig,
  namespace: string
): ResourceCollection {
  const collection = new ResourceCollection();

  const domain = getDomain(state);

  const controllerConfig: ControllerConfigType = getControllerConfig(state);

  const api = "config";
  const name = `${api}-api`;

  const probeConfig = {
    httpGet: {
      path: "/metrics",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      port: 8080 as any,
      scheme: "HTTP"
    },
    timeoutSeconds: 1,
    periodSeconds: 10,
    successThreshold: 1,
    failureThreshold: 3
  };

  const commandArgs = [
    "-listen=:8080",
  ]
  const commandEnv: V1EnvVar[] = [
    {
      name: "GRAPHQL_ENDPOINT",
      value: `http://graphql.application.svc.cluster.local:8080/v1/graphql`
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
  ]

  if (controllerConfig.disable_data_api_authentication) {
    commandArgs.push("-disable-api-authn");
  } else {
    commandEnv.push(
      {
        name: "API_AUTHTOKEN_VERIFICATION_PUBKEY",
        value: controllerConfig.data_api_authn_pubkey_pem
      }
    );
  }

  collection.add(
    new Deployment(
      {
        apiVersion: "apps/v1",
        kind: "Deployment",
        metadata: {
          name,
          namespace,
          labels: {
            "k8s-app": name
          }
        },
        spec: {
          replicas: 1,
          selector: {
            matchLabels: {
              "k8s-app": name
            }
          },
          template: {
            metadata: {
              labels: {
                "k8s-app": name
              }
            },
            spec: {
              affinity: withPodAntiAffinityRequired({
                "k8s-app": name
              }),
              containers: [
                {
                  name,
                  image: DockerImages.configApi,
                  imagePullPolicy: "Always",
                  args: commandArgs,
                  env: commandEnv,
                  ports: [
                    {
                      name: "http",
                      protocol: "TCP",
                      containerPort: 8080
                    }
                  ],
                  readinessProbe: probeConfig,
                  livenessProbe: probeConfig,
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
    new Service(
      {
        apiVersion: "v1",
        kind: "Service",
        metadata: {
          name,
          labels: {
            "k8s-app": name,
            job: `${namespace}.${name}`
          },
          namespace
        },
        spec: {
          ports: [
            {
              name: "http",
              port: 8080,
              protocol: "TCP",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: 8080 as any
            }
          ],
          selector: {
            "k8s-app": name
          }
        }
      },
      kubeConfig
    )
  );

  // No per-tenant ingress hosts at the moment.
  // We could someday add per-tenant Ingresses, but they would be in other namespaces...
  const apiHost = `${api}.${domain}`
  collection.add(
    new Ingress(
      {
        apiVersion: "networking.k8s.io/v1beta1",
        kind: "Ingress",
        metadata: {
          name: `${api}`,
          namespace,
          annotations: {
            "kubernetes.io/ingress.class": "api",
            "external-dns.alpha.kubernetes.io/ttl": "30",
            "nginx.ingress.kubernetes.io/client-body-buffer-size": "10m"
          }
        },
        spec: {
          tls: [
            {
              hosts: [apiHost],
              secretName: "https-cert"
            }
          ],
          rules: [
            {
              host: apiHost,
              http: {
                paths: [
                  {
                    backend: {
                      serviceName: name,
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  collection.add(
    new V1ServicemonitorResource(
      {
        apiVersion: "monitoring.coreos.com/v1",
        kind: "ServiceMonitor",
        metadata: {
          labels: {
            "k8s-app": name,
            tenant: "system"
          },
          name,
          namespace
        },
        spec: {
          endpoints: [
            {
              interval: "30s",
              path: "/metrics",
              port: "http"
            }
          ],
          jobLabel: "job",
          namespaceSelector: {
            matchNames: [namespace]
          },
          selector: {
            matchLabels: {
              "k8s-app": name
            }
          }
        }
      },
      kubeConfig
    )
  );

  return collection;
}
