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
  ResourceCollection,
  Service,
  V1ServicemonitorResource,
  withPodAntiAffinityRequired
} from "@opstrace/kubernetes";
import { State } from "../../reducer";
import { KubeConfig, V1EnvVar } from "@kubernetes/client-node";
import { getControllerConfig } from "../../helpers";
import {
  DockerImages,
  LatestControllerConfigType
} from "@opstrace/controller-config";

export function OpstraceAPIResources(
  state: State,
  kubeConfig: KubeConfig,
  namespace: string
): ResourceCollection {
  const collection = new ResourceCollection();

  const controllerConfig: LatestControllerConfigType = getControllerConfig(state);

  const name = `opstrace-api`;

  const probeConfig = {
    httpGet: {
      path: "/metrics",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      port: "action" as any,
      scheme: "HTTP"
    },
    timeoutSeconds: 1,
    periodSeconds: 10,
    successThreshold: 1,
    failureThreshold: 3
  };

  const commandArgs = [
    "-config=:8080",
    "-action=:8081",
  ];
  const commandEnv: V1EnvVar[] = [
    {
      name: "GRAPHQL_ENDPOINT",
      value: `http://graphql.${namespace}.svc.cluster.local:8080/v1/graphql`
    },
    {
      name: "CORTEX_RULER_ENDPOINT",
      value: "http://ruler.cortex.svc.cluster.local"
    },
    {
      name: "CORTEX_ALERTMANAGER_ENDPOINT",
      value: "http://alertmanager.cortex.svc.cluster.local"
    },
    {
      name: "HASURA_GRAPHQL_ADMIN_SECRET",
      valueFrom: {
        secretKeyRef: {
          name: "hasura-admin-secret",
          key: "HASURA_ADMIN_SECRET"
        }
      }
    },
    {
      name: "HASURA_ACTION_SECRET",
      valueFrom: {
        secretKeyRef: {
          name: "hasura-action-secret",
          key: "HASURA_CONFIG_API_SECRET"
        }
      }
    }
  ];

  if (controllerConfig.disable_data_api_authentication) {
    commandArgs.push("-disable-api-authn");
  } else {
    commandEnv.push({
      name: "API_AUTHTOKEN_VERIFICATION_PUBKEY_SET",
      value: controllerConfig.tenant_api_authenticator_pubkey_set_json
    });

    const data_api_authn_pubkey_pem = controllerConfig.data_api_authn_pubkey_pem ?? "";
    if (data_api_authn_pubkey_pem !== "") {
      commandEnv.push({
        name: "API_AUTHTOKEN_VERIFICATION_PUBKEY",
        value: data_api_authn_pubkey_pem
      });
    }
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
            app: name
          }
        },
        spec: {
          replicas: 1,
          selector: {
            matchLabels: {
              app: name
            }
          },
          strategy: {
            type: "RollingUpdate",
            rollingUpdate: {
              maxSurge: "25%" as any,
              maxUnavailable: "25%" as any
            }
          },
          template: {
            metadata: {
              labels: {
                app: name
              }
            },
            spec: {
              affinity: withPodAntiAffinityRequired({
                app: name
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
                    },
                    {
                      name: "action",
                      protocol: "TCP",
                      containerPort: 8081
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
            app: name,
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
              targetPort: "http" as any
            },
            {
              name: "action",
              port: 8081,
              protocol: "TCP",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              targetPort: "action" as any
            }
          ],
          selector: {
            app: name
          }
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
            app: name,
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
              port: "action"
            }
          ],
          jobLabel: "job",
          namespaceSelector: {
            matchNames: [namespace]
          },
          selector: {
            matchLabels: {
              app: name
            }
          }
        }
      },
      kubeConfig
    )
  );

  return collection;
}
