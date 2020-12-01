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
  Secret
} from "@opstrace/kubernetes";
import { KubeConfig } from "@kubernetes/client-node";
import { generateSecretValue } from "../helpers";

export const CONTROLLER_NAME = "opstrace-controller";

export function ControllerResources({
  controllerImage,
  opstraceClusterName,
  kubeConfig
}: {
  controllerImage: string;
  opstraceClusterName: string;
  kubeConfig: KubeConfig;
}): ResourceCollection {
  const collection = new ResourceCollection();
  const namespace = "kube-system";
  const name = CONTROLLER_NAME;

  const controllerCmdlineArgs = [`${opstraceClusterName}`];

  // create this secret in the kube-system namespace. The controller
  // itself will copy this secret over to the application namespace
  // when the controller starts.
  const hasuraAdminSecret = new Secret(
    {
      apiVersion: "v1",
      data: {
        HASURA_ADMIN_SECRET: Buffer.from(generateSecretValue()).toString(
          "base64"
        )
      },
      kind: "Secret",
      metadata: {
        name: "hasura-admin-secret",
        namespace: namespace
      }
    },
    kubeConfig
  );
  // We don't want this value to change once it exists either.
  // The value of this secret can always be updated manually in the cluster if needs be (kubectl delete <name> -n application) and the controller will create a new one.
  // The corresponding deployment pods that consume it will need to be restarted also to get the new env var containing the new secret.
  hasuraAdminSecret.setImmutable();
  collection.add(hasuraAdminSecret);

  collection.add(
    new Deployment(
      {
        apiVersion: "apps/v1",
        kind: "Deployment",
        metadata: {
          name,
          namespace,
          labels: {
            "k8s-app": "opstrace-controller"
          }
        },
        spec: {
          replicas: 1,
          strategy: {
            type: "Recreate"
          },
          selector: {
            matchLabels: {
              name
            }
          },
          template: {
            metadata: {
              labels: {
                name
              }
            },
            spec: {
              serviceAccountName: "opstrace-controller",
              containers: [
                {
                  name: "opstrace-controller",
                  image: `${controllerImage}`,
                  imagePullPolicy: "Always",
                  command: ["node", "--prof", "./cmd.js"],
                  args: controllerCmdlineArgs,
                  resources: {
                    limits: {
                      cpu: "1",
                      memory: "1Gi"
                    },
                    requests: {
                      cpu: "0.5",
                      memory: "500Mi"
                    }
                  },
                  env: [
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
                      name: "GRAPHQL_ENDPOINT",
                      value: `http://graphql.application.svc.cluster.local:8080/v1/graphql`
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

  collection.add(
    new ServiceAccount(
      {
        apiVersion: "v1",
        kind: "ServiceAccount",
        metadata: {
          name: "opstrace-controller",
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
          name: "opstrace-controller-clusteradmin-binding"
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "ClusterRole",
          name: "cluster-admin"
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: "opstrace-controller",
            namespace
          }
        ]
      },
      kubeConfig
    )
  );

  return collection;
}
