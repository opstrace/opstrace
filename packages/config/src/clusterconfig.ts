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

// supposed to be a tidy immutable singleton in the future: write/set once,
// read/consume from anywhere w/o the need to explicitly pass this through
// function arguments.
let clusterConfig: NewRenderedClusterConfigType;

// not implementing length constraint, on purpose
export const CLUSTER_NAME_REGEX = /^[a-z0-9-_]+$/;

export function setClusterConfig(c: NewRenderedClusterConfigType) {
  if (clusterConfig !== undefined) {
    throw new Error("setClusterConfig() was already called before");
  }
  clusterConfig = c;
}

export function getClusterConfig(): NewRenderedClusterConfigType {
  if (clusterConfig === undefined) {
    throw new Error("call setClusterConfig() first");
  }
  return clusterConfig;
}

export interface InfraConfigTypeAWS {
  region: string;
  zone_suffix: string;
  instance_type: string;
  eks_admin_roles: string[];
}

export interface InfraConfigTypeGCP {
  machine_type: string;
  region: string;
  zone_suffix: string;
}

// Using the yup-inferred types across the code base, deep down in other packages
// is creating a lot of pain. Use yup for user-given doc validation, but then
// save to 'natively defined Typescript types/interfaces' asap.
export interface NewRenderedClusterConfigType {
  cluster_name: string;
  cloud_provider: "aws" | "gcp";
  cert_issuer: "letsencrypt-prod" | "letsencrypt-staging";
  data_api_authn_pubkey_pem: string;
  controller_image: string;
  tenants: string[];
  env_label: string;
  log_retention_days: number; // bigint to force this to integer?
  metric_retention_days: number; // bigint to force this to integer?
  data_api_authentication_disabled: boolean;
  data_api_authorized_ip_ranges: string[];
  node_count: number; // bigint to force this to integer?
  aws: InfraConfigTypeAWS | undefined;
  gcp: InfraConfigTypeGCP | undefined;
}
