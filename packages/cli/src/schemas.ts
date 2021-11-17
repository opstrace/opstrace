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

// import {
//   LatestAWSInfraConfigType,
//   LatestGCPInfraConfigType
// } from "@opstrace/config";
// import { die, log } from "@opstrace/utils";

// import {
//   ClusterConfigFileSchemaTypeV1,
//   ClusterConfigFileSchemaV1
// } from "./schemasv1";

import {
  AWSInfraConfigSchemaV2,
  GCPInfraConfigSchemaV2,
  ClusterConfigFileSchemaV2,
  RenderedClusterConfigSchemaV2,
  ClusterConfigFileSchemaTypeV2,
  RenderedClusterConfigSchemaTypeV2
} from "./schemasv2";

// const pointing to the latest schema versions
export const LatestAWSInfraConfigSchema = AWSInfraConfigSchemaV2;
export const LatestGCPInfraConfigSchema = GCPInfraConfigSchemaV2;
export const LatestClusterConfigFileSchema = ClusterConfigFileSchemaV2;
export const LatestRenderedClusterConfigSchema = RenderedClusterConfigSchemaV2;

// type aliases poiting to the latest version types
export type LatestRenderedClusterConfigSchemaType =
  RenderedClusterConfigSchemaTypeV2;
export type LatestClusterConfigFileSchemaType = ClusterConfigFileSchemaTypeV2;
