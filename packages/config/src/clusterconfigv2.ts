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

export interface AWSInfraConfigTypeV2 {
  region: string;
  zone_suffix: string;
  instance_type: string;
  eks_admin_roles: string[];
}

export interface GCPInfraConfigTypeV2 {
  machine_type: string;
  region: string;
  zone_suffix: string;
}

// Using the yup-inferred types across the code base, deep down in other packages
// is creating a lot of pain. Use yup for user-given doc validation, but then
// save to 'natively defined Typescript types/interfaces' asap.
export interface ClusterConfigTypeV2 {
  cluster_name: string;
  cloud_provider: "aws" | "gcp";
  cert_issuer: "letsencrypt-prod" | "letsencrypt-staging";
  tenant_api_authenticator_pubkey_set_json: string;
  controller_image: string;
  tenants: string[];
  env_label: string;
  log_retention_days: number; // bigint to force this to integer?
  metric_retention_days: number; // bigint to force this to integer?
  data_api_authentication_disabled: boolean;
  data_api_authorized_ip_ranges: string[];
  node_count: number; // bigint to force this to integer?
  aws: AWSInfraConfigTypeV2 | undefined;
  gcp: GCPInfraConfigTypeV2 | undefined;
}
