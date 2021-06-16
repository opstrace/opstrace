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

import { KubeConfig } from "@kubernetes/client-node";
import { ResourceCollection, Secret } from "@opstrace/kubernetes";
import { State } from "../../reducer";

export const DOCKERHUB_CREDS_SECRET_NAME = "dockerhub-credentials";
const DOCKERHUB_CREDS_NAMESPACE = "kube-system";

export function createDockerHubCredsSecret(
  username: string,
  token: string,
  kubeConfig: KubeConfig
) {
  const dockerconfig = `{"auths":{"https://index.docker.io/v2/":{"auth":"${Buffer.from(
    `${username}:${token}`
  ).toString("base64")}"}}}`;

  return new Secret(
    {
      apiVersion: "v1",
      kind: "Secret",
      type: "kubernetes.io/dockerconfigjson",
      data: {
        ".dockerconfigjson": Buffer.from(dockerconfig).toString("base64")
      },
      metadata: {
        name: DOCKERHUB_CREDS_SECRET_NAME,
        namespace: DOCKERHUB_CREDS_NAMESPACE
      }
    },
    kubeConfig
  );
}

export function getDockerHubCredsSecret(state: State) {
  return state.kubernetes.cluster.Secrets.resources.find(
    secret =>
      secret.name === DOCKERHUB_CREDS_SECRET_NAME &&
      secret.namespace === DOCKERHUB_CREDS_NAMESPACE
  );
}

export function DockerHubResources(
  state: State,
  kubeConfig: KubeConfig
): ResourceCollection {
  const collection = new ResourceCollection();

  const secretToClone = getDockerHubCredsSecret(state);

  if (!secretToClone) {
    return collection;
  }

  // Copy into all other namespaces
  state.kubernetes.cluster.Namespaces.resources
    .filter(n => n.name !== DOCKERHUB_CREDS_NAMESPACE)
    .forEach(n => {
      collection.add(
        new Secret(
          {
            apiVersion: "v1",
            kind: "Secret",
            type: "kubernetes.io/dockerconfigjson",
            data: secretToClone.data,
            metadata: {
              name: DOCKERHUB_CREDS_SECRET_NAME,
              namespace: n.name
            }
          },
          kubeConfig
        )
      );
    });

  return collection;
}
