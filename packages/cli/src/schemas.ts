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


import { log } from "@opstrace/utils";

import {
  ClusterConfigFileSchemaTypeV1, ClusterConfigFileSchemaV1
} from "./schemasv1";

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
export type LatestRenderedClusterConfigSchemaType = RenderedClusterConfigSchemaTypeV2;
export type LatestClusterConfigFileSchemaType = ClusterConfigFileSchemaTypeV2;

//
export type AnyClusterConfigFileSchemaType = ClusterConfigFileSchemaTypeV1 | ClusterConfigFileSchemaTypeV2;

function V1toV2(ucc: ClusterConfigFileSchemaTypeV1): ClusterConfigFileSchemaTypeV2 {
  const { log_retention, metric_retention, ...restConfig } = ucc;
  return {
    ...restConfig,
    log_retention_days: log_retention,
    metric_retention_days: metric_retention
  }
}

// function that takes any user cluster config and upgrades it to the latest
// version if necessary.
// @ts-ignore missing return type on function becaue it'll throw an error
export function upgradeToLatest(ucc: any): LatestClusterConfigFileSchemaType {

  if (LatestClusterConfigFileSchema.isValidSync(ucc, { strict: true })) {
    // validate again, this time "only" to interpolate with defaults, see
    // https://github.com/jquense/yup/pull/961
    log.debug("got latest cluster config file version");
    return LatestClusterConfigFileSchema.validateSync(ucc);
  }

  if (ClusterConfigFileSchemaV1.isValidSync(ucc, {strict: true})) {
    log.debug("got v1 cluster config file");
    return V1toV2(ClusterConfigFileSchemaV1.validateSync(ucc));
  }

  // Possible user error. Parse again to throw a meaningful error message.
  LatestClusterConfigFileSchema.validateSync(ucc, {strict: true});
}
