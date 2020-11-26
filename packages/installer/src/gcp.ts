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

import { call, delay } from "redux-saga/effects";
import { protos as gkeProtos } from "@google-cloud/container";

import {
  ensureBucketExists,
  ensureNetworkExists,
  ensureSubNetworkExists,
  ensureGatewayExists,
  ensureGKEExists,
  generateKubeconfigStringForGkeCluster
} from "@opstrace/gcp";
import { ensureDNSExists } from "@opstrace/dns";
import { getGKEClusterConfig, getDnsConfig } from "@opstrace/config";
import { GCPAuthOptions } from "@opstrace/gcp";
import { getBucketName, log, SECOND } from "@opstrace/utils";
import {
  getClusterConfig,
  //RenderedClusterConfigSchemaType
  NewRenderedClusterConfigType
} from "@opstrace/config";
import { gcpProjectID } from "./index";

export function* ensureGCPInfraExists(gcpAuthOptions: GCPAuthOptions) {
  const ccfg: NewRenderedClusterConfigType = getClusterConfig();

  if (ccfg.gcp === undefined) {
    throw Error("`gcp` property expected");
  }

  const dnsConf = getDnsConfig(ccfg.cloud_provider);
  const dnsname = yield call(ensureDNSExists, {
    opstraceClusterName: ccfg.cluster_name,
    dnsName: dnsConf.dnsName,
    target: ccfg.cloud_provider,
    dnsProvider: ccfg.cloud_provider
  });

  log.info("DNS name has been set up: %s", dnsname);

  const gkeConf = getGKEClusterConfig(ccfg, gcpAuthOptions);

  yield call(ensureBucketExists, {
    bucketName: getBucketName({
      clusterName: ccfg.cluster_name,
      suffix: "loki"
    }),
    retentionDays: ccfg.log_retention_days,
    region: ccfg.gcp.region
  });

  yield call(ensureBucketExists, {
    bucketName: getBucketName({
      clusterName: ccfg.cluster_name,
      suffix: "cortex"
    }),
    retentionDays: ccfg.metric_retention_days,
    region: ccfg.gcp.region
  });

  log.info(`Ensuring VPC exists`);
  yield call(ensureNetworkExists, ccfg.cluster_name);

  // Delay to work around VPC not being ready. TODO - investigate
  // how to detect if VPC is ready.
  yield delay(20 * SECOND);

  log.info(`Ensuring Subnet exists`);
  yield call(ensureSubNetworkExists, {
    opstraceClusterName: ccfg.cluster_name,
    gcpRegion: ccfg.gcp.region,
    gcpProjectID: gcpProjectID,
    ipCidrRange: "192.168.0.0/19"
  });

  log.info(`Ensuring CloudNat and Router exists`);
  yield call(ensureGatewayExists, {
    name: ccfg.cluster_name,
    region: ccfg.gcp.region,
    gcpProjectID
  });

  // Note(jp): the `gkeConf` object contains a property called `name` which
  // is the GKE cluster name. In addition we provide a `name` property
  // directly, which I have now renamed to `GKEClusterName` because I think
  // it's semantically the same. When that is confirmed I think we should
  // not pass this piece of information in twice, but only once.
  log.info(`Ensuring GKE exists`);
  const gkecluster: gkeProtos.google.container.v1.ICluster = yield call(
    ensureGKEExists,
    {
      GKEClusterName: ccfg.cluster_name,
      region: ccfg.gcp.region,
      gcpProjectID,
      zone: ccfg.gcp.zone_suffix,
      cluster: gkeConf
    }
  );

  const gkeKubeconfigString: string = generateKubeconfigStringForGkeCluster(
    gcpProjectID,
    gkecluster
  );

  return gkeKubeconfigString;
}
