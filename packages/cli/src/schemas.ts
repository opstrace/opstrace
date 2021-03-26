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


import { LatestAWSInfraConfigType, LatestGCPInfraConfigType } from "@opstrace/config";
import { die, log } from "@opstrace/utils";

import {
  ClusterConfigFileSchemaTypeV1,
  ClusterConfigFileSchemaV1
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

// upgrade function
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
export async function upgradeToLatest(ucc: any, cloudProvider: string): Promise<[
  LatestClusterConfigFileSchemaType,
  LatestAWSInfraConfigType | undefined,
  LatestGCPInfraConfigType | undefined
]> {
  // handle user cluster config
  const uccWithDefaults = upgradeClusterConfigSchemaToLatest(ucc);

  // handle user cloud provider config
  let infraConfigAWS: LatestAWSInfraConfigType | undefined;
  let infraConfigGCP: LatestGCPInfraConfigType | undefined;

  switch(cloudProvider) {
    case "aws": {
      infraConfigAWS = upgradeAWSInfraConfigToLatest(uccWithDefaults.aws);
      break;
    }
    case "gcp": {
      infraConfigGCP = upgradeGCPInfraConfigToLatest(uccWithDefaults.gcp);
      break;
    }

    default: {
      die(`cloud provider not supported: ${cloudProvider}`)
    }
  }

  // provider-specific infra config has been extracted, remove all traces
  // from ucc
  delete uccWithDefaults.aws;
  delete uccWithDefaults.gcp;

  return [uccWithDefaults, infraConfigAWS, infraConfigGCP];
}

function upgradeClusterConfigSchemaToLatest(ucc: any): LatestClusterConfigFileSchemaType {
  if (LatestClusterConfigFileSchema.isValidSync(ucc, { strict: true })) {
    // validate again, this time "only" to interpolate with defaults, see
    // https://github.com/jquense/yup/pull/961
    log.debug("got latest cluster config file version");
    return LatestClusterConfigFileSchema.validateSync(ucc);
  }

  if (ClusterConfigFileSchemaV1.isValidSync(ucc, {strict: true})) {
    log.debug("got v1 cluster config file, upgrading...");
    return V1toV2(ClusterConfigFileSchemaV1.validateSync(ucc));
  }

  // Possible user error. Parse again and it'll throw a meaningful error
  // message.
  return LatestClusterConfigFileSchema.validateSync(ucc, {strict: true});
}

// throws an error when parsing invalid data
function upgradeAWSInfraConfigToLatest(uic: any): LatestAWSInfraConfigType {
  // AWSInfraConfigTypeV1 matches AWSInfraConfigTypeV2 so we don't need to do
  // any validation

  log.debug("ucc.aws: %s", JSON.stringify(uic, null, 2));
  return LatestAWSInfraConfigSchema.validateSync(uic);
}

// throws an error when parsing invalid data
function upgradeGCPInfraConfigToLatest(uic: any): LatestGCPInfraConfigType {
  // GCPInfraConfigTypeV1 matches GCPInfraConfigTypeV2 so we don't need to do
  // any validation

  log.debug("ucc.gcp: %s", JSON.stringify(uic, null, 2));
  return LatestGCPInfraConfigSchema.validateSync(uic);
}
