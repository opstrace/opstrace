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

import { readJSONFromFile } from "@opstrace/utils";

import { protos as gkeProtos } from "@google-cloud/container";

import { GCPAuthOptions, serviceAccountSchema } from "./types";

export function generateKubeconfigStringForGkeCluster(
  projectid: string,
  cluster: gkeProtos.google.container.v1.ICluster
): string {
  const context = `${projectid}_${cluster.name}`;
  return `apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: ${cluster.masterAuth!.clusterCaCertificate}
    server: https://${cluster.endpoint}
  name: ${context}
contexts:
- context:
    cluster: ${context}
    user: ${context}
  name: ${context}
current-context: ${context}
kind: Config
preferences: {}
users:
- name: ${context}
  user:
    auth-provider:
      config:
        cmd-args: config config-helper --format=json
        cmd-path: gcloud
        expiry-key: '{.credential.token_expiry}'
        token-key: '{.credential.access_token}'
      name: gcp
`;
}

/**
 * Returns GCPAuthOptions or throws if not valid
 * @param gcpCredFilePath string
 */
export const getValidatedGCPAuthOptionsFromFile = (
  gcpCredFilePath: string
): GCPAuthOptions => {
  const gcpCredsRaw = readJSONFromFile(gcpCredFilePath);
  const gcpServiceAccount = serviceAccountSchema.validateSync(gcpCredsRaw);
  const gcpAuthOptions: GCPAuthOptions = {
    projectId: gcpServiceAccount.project_id,
    credentials: gcpServiceAccount
  };
  return gcpAuthOptions;
};

let certManagerSA: string | undefined;

export function setCertManagerServiceAccount(sa: string): void {
  certManagerSA = sa;
}

export function getCertManagerServiceAccount(): string {
  if (certManagerSA === undefined) {
    throw new Error("call setCertManagerServiceAccount() first");
  }
  return certManagerSA;
}

let externalDNSSA: string | undefined;

export function setExternalDNSServiceAccount(sa: string): void {
  externalDNSSA = sa;
}

export function getExternalDNSServiceAccount(): string {
  if (externalDNSSA === undefined) {
    throw new Error("call setExternalDNSServiceAccount() first");
  }
  return externalDNSSA;
}

let cortexSA: string | undefined;

export function setCortexServiceAccount(sa: string): void {
  cortexSA = sa;
}

export function getCortexServiceAccount(): string {
  if (cortexSA === undefined) {
    throw new Error("call setCortexServiceAccount() first");
  }
  return cortexSA;
}

let lokiSA: string | undefined;

export function setLokiServiceAccount(sa: string): void {
  lokiSA = sa;
}

export function getLokiServiceAccount(): string {
  if (lokiSA === undefined) {
    throw new Error("call setLokiServiceAccount() first");
  }
  return lokiSA;
}
