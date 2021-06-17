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

import { KubeConfig, V1PodSpec } from "@kubernetes/client-node";
import {
  Namespaces,
  ResourceCollection,
  Secret,
  Secrets
} from "@opstrace/kubernetes";
import { log } from "@opstrace/utils";

export const OPSTRACE_DOCKERHUB_USERNAME = "OPSTRACE_DOCKERHUB_USERNAME";
export const OPSTRACE_DOCKERHUB_TOKEN = "OPSTRACE_DOCKERHUB_TOKEN";
export const DOCKERHUB_CREDS_SECRET_NAME = "dockerhub-credentials";
const DOCKERHUB_CREDS_NAMESPACE = "kube-system";

export function logDockerHubCredentialsMessage(
  lifecycleType: "create" | "upgrade"
) {
  const username = process.env[OPSTRACE_DOCKERHUB_USERNAME];
  const token = process.env[OPSTRACE_DOCKERHUB_TOKEN];

  if (!(username && token)) {
    log.info(
      `${OPSTRACE_DOCKERHUB_USERNAME}, ${OPSTRACE_DOCKERHUB_TOKEN} not present, will skip ${
        lifecycleType == "create" ? "creating" : "updating"
      } image pull secret for DockerHub`
    );
  } else {
    log.info(
      `will ${
        lifecycleType == "create" ? "create" : "update"
      } image pull secret for DockerHub with username: ${username}, token: ${token.charAt(
        0
      )}...${token.slice(-1)}`
    );
  }
}

export function dockerHubCredsSecret(kubeConfig: KubeConfig) {
  const collection = new ResourceCollection();
  const username = process.env[OPSTRACE_DOCKERHUB_USERNAME];
  const token = process.env[OPSTRACE_DOCKERHUB_TOKEN];

  if (!(username && token)) {
    return collection;
  }

  const credsEncoded = Buffer.from(`${username}:${token}`).toString("base64");
  const jsonString = `{"auths":{"https://index.docker.io/v2/":{"auth":"${credsEncoded}"}}}`;

  collection.add(
    new Secret(
      {
        apiVersion: "v1",
        kind: "Secret",
        type: "kubernetes.io/dockerconfigjson",
        data: {
          ".dockerconfigjson": Buffer.from(jsonString).toString("base64")
        },
        metadata: {
          name: DOCKERHUB_CREDS_SECRET_NAME,
          namespace: DOCKERHUB_CREDS_NAMESPACE
        }
      },
      kubeConfig
    )
  );

  return collection;
}

function getDockerHubCredsSecret(secrets: Secrets) {
  return secrets.find(
    secret =>
      secret.name === DOCKERHUB_CREDS_SECRET_NAME &&
      secret.namespace === DOCKERHUB_CREDS_NAMESPACE
  );
}

// Memoized value for each reconciliation, so each podspec can refer to this
let hasDockerhubCreds = false;

/**
 * Memoize this at the beginning of reconciliation for all podspecs to use during reconciliation
 * @param state
 */
export function memoizeImagePullSecrets(secrets: Secrets) {
  hasDockerhubCreds = getDockerHubCredsSecret(secrets) ? true : false;
}
/**
 * Returns image pull secrets for Pod specs, if dockerhub credentials exist
 */
export function getImagePullSecrets(): V1PodSpec["imagePullSecrets"] {
  if (hasDockerhubCreds) {
    return [
      {
        name: DOCKERHUB_CREDS_SECRET_NAME
      }
    ];
  }
  return undefined;
}

export function DockerHubResources(
  secrets: Secrets,
  namespaces: Namespaces,
  kubeConfig: KubeConfig
): ResourceCollection {
  const collection = new ResourceCollection();

  const secretToClone = getDockerHubCredsSecret(secrets);

  if (!secretToClone) {
    return collection;
  }

  // Copy into all other namespaces
  namespaces
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
