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
  ServiceAccount
} from "@opstrace/kubernetes";
import { KubeConfig } from "@kubernetes/client-node";

export const CONTROLLER_NAME = "opstrace-controller";

export function ControllerResources({
  controllerImage,
  opstraceClusterName,
  mode,
  kubeConfig
}: {
  controllerImage: string;
  opstraceClusterName: string;
  mode: "development" | "production";
  kubeConfig: KubeConfig;
}): ResourceCollection {
  const collection = new ResourceCollection();
  const namespace = "kube-system";
  const name = CONTROLLER_NAME;

  const controllerCmdlineArgs = [`${opstraceClusterName}`];
  if (mode == "production") {
    controllerCmdlineArgs.push("--prod");
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
              imagePullSecrets: [{ name: "dockerhub-credentials" }],
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
