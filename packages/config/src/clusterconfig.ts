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
  AWSInfraConfigTypeV2,
  GCPInfraConfigTypeV2,
  ClusterConfigTypeV2
} from "./clusterconfigv2";

// supposed to be a tidy immutable singleton in the future: write/set once,
// read/consume from anywhere w/o the need to explicitly pass this through
// function arguments.
let clusterConfig: LatestClusterConfigType;

// not implementing length constraint, on purpose
export const CLUSTER_NAME_REGEX = /^[a-z0-9-_]+$/;

// This is the same regex the k8s ecosystem uses for dns-related label values
// see https://github.com/opstrace/opstrace/issues/710
// Additionally we had to remove dashes from valid tenant names
// see https://github.com/opstrace/opstrace/issues/957
export const TENANT_NAME_REGEX = /^[a-z0-9]([a-z0-9]*[a-z0-9])?$/;

export function setClusterConfig(c: LatestClusterConfigType): void {
  if (clusterConfig !== undefined) {
    throw new Error("setClusterConfig() was already called before");
  }
  clusterConfig = c;
}

export function getClusterConfig(): LatestClusterConfigType {
  if (clusterConfig === undefined) {
    throw new Error("call setClusterConfig() first");
  }
  return clusterConfig;
}

// type alias that points to latest config schemas
export type LatestClusterConfigType = ClusterConfigTypeV2;
export type LatestAWSInfraConfigType = AWSInfraConfigTypeV2;
export type LatestGCPInfraConfigType = GCPInfraConfigTypeV2;
