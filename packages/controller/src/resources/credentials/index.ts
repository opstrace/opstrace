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
import { Credential } from "../../reducers/graphql/credentials";
import { toTenantNamespace } from "../../helpers";
import { State } from "../../reducer";
import { log } from "@opstrace/utils";

export function CredentialResources(
  state: State,
  kubeConfig: KubeConfig
): ResourceCollection {
  const collection = new ResourceCollection();

  // Get all credentials from GraphQL/Postgres
  state.graphql.Credentials.resources.forEach(credential => {
    const kubeSecret = toKubeSecret(credential, kubeConfig);
    if (kubeSecret) {
      collection.add(kubeSecret);
    }
  });

  return collection;
}

const toKubeSecret = (
  credential: Credential,
  kubeConfig: KubeConfig,
): Secret | null => {
  let data: { [key: string]: string };
  if (credential.type == "aws-key") {
    // Pass through the key_id and access_key as distinct string values, which can then be used as envvars
    // {"AWS_ACCESS_KEY_ID": "id", "AWS_SECRET_ACCESS_KEY": "secret"}
    data = JSON.parse(credential.value);
  } else if (credential.type == "gcp-service-account") {
    // Pass through the json payload as a string/single file
    data = {"secret.json": credential.value};
  } else {
    log.warning("Credential %s/%s has unsupported type: %s", credential.tenant, credential.name, credential.type);
    return null;
  }

  // K8s wants Secret values to be base64-encoded
  const datab64 = Object.fromEntries(
    Object.entries(data)
      .map(([k, v]) => [k, Buffer.from(v).toString("base64")])
  );

  return new Secret(
    {
      apiVersion: "v1",
      kind: "Secret",
      metadata: {
        name: `credential-${credential.name}`,
        namespace: toTenantNamespace(credential.tenant),
        labels: {
          // Future-proofing, just in case
          "opstrace.com/credential-name": credential.name,
          "opstrace.com/credential-type": credential.type,
          "opstrace.com/credential-version": "1",
        },
      },
      data: datab64,
    },
    kubeConfig
  );
};
