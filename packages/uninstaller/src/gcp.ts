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

import { call, CallEffect, ForkEffect, JoinEffect } from "redux-saga/effects";
import { Task } from "redux-saga";
import { strict as assert } from "assert";
import {
  ensureGKEDoesNotExist,
  ensureGatewayDoesNotExist,
  ensureNetworkDoesNotExist,
  ensureSubNetworkDoesNotExist,
  ensureCloudSQLDoesNotExist,
  emptyBucket,
  ensureServiceAccountDoesNotExist
} from "@opstrace/gcp";
import { destroyDNS } from "@opstrace/dns";
import { log, getBucketName } from "@opstrace/utils";

import { destroyConfig } from "./index";

export function* destroyGCPInfra(): Generator<
  JoinEffect | CallEffect | ForkEffect | Generator<ForkEffect, Task[], Task>,
  void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
> {
  assert(destroyConfig.gcpProjectID);
  assert(destroyConfig.gcpRegion);

  log.info(`Ensure cert-manager service account deletion`);
  yield call(ensureServiceAccountDoesNotExist, {
    // name-based convention, sync with installer
    name: `${destroyConfig.clusterName}-crtmgr`,
    projectId: destroyConfig.gcpProjectID,
    role: "roles/dns.admin"
  });
  // Note(JP): naming convention changed in Feb 2021. Previously, the account
  // was called *-cert-manager. Make this newer uninstaller compatible with
  // clusters created with an older installer (so that the *-cert-manager is
  // deleted if it exists).
  yield call(ensureServiceAccountDoesNotExist, {
    // name-based convention, sync with installer
    name: `${destroyConfig.clusterName}-cert-manager`,
    projectId: destroyConfig.gcpProjectID,
    role: "roles/dns.admin"
  });

  log.info(`Ensure external-dns service account deletion`);

  yield call(ensureServiceAccountDoesNotExist, {
    name: `${destroyConfig.clusterName}-extdns`,
    projectId: destroyConfig.gcpProjectID,
    role: "roles/dns.admin"
  });
  // for backwards compat (name changed from *-external-dns to -extdns)
  yield call(ensureServiceAccountDoesNotExist, {
    name: `${destroyConfig.clusterName}-external-dns`,
    projectId: destroyConfig.gcpProjectID,
    role: "roles/dns.admin"
  });

  log.info(`Ensure cortex service account deletion`);
  yield call(ensureServiceAccountDoesNotExist, {
    name: `${destroyConfig.clusterName}-cortex`,
    projectId: destroyConfig.gcpProjectID,
    role: "roles/storage.admin"
  });

  log.info(`Ensure loki service account deletion`);
  yield call(ensureServiceAccountDoesNotExist, {
    name: `${destroyConfig.clusterName}-loki`,
    projectId: destroyConfig.gcpProjectID,
    role: "roles/storage.admin"
  });

  const lokiBucketName = getBucketName({
    clusterName: destroyConfig.clusterName,
    suffix: "loki"
  });
  const lokiConfigBucketName = getBucketName({
    clusterName: destroyConfig.clusterName,
    suffix: "loki-config"
  });
  const cortexDataBucketName = getBucketName({
    clusterName: destroyConfig.clusterName,
    suffix: "cortex"
  });
  const cortexConfigBucketName = getBucketName({
    clusterName: destroyConfig.clusterName,
    suffix: "cortex-config"
  });

  log.info(`Ensure GKE deletion`);
  yield call(ensureGKEDoesNotExist, destroyConfig.clusterName);

  log.info("Ensure CloudSQL deletion");
  yield call(ensureCloudSQLDoesNotExist, {
    opstraceClusterName: destroyConfig.clusterName,
    addressName: `google-managed-services-${destroyConfig.clusterName}`
  });

  log.info(`Destroying CloudNat and Router`);
  yield call(
    ensureGatewayDoesNotExist,
    destroyConfig.clusterName,
    destroyConfig.gcpRegion
  );

  log.info(`Destroying Subnet`);
  yield call(
    ensureSubNetworkDoesNotExist,
    destroyConfig.clusterName,
    destroyConfig.gcpRegion
  );

  log.info(`Destroying VPC`);
  yield call(ensureNetworkDoesNotExist, {
    name: destroyConfig.clusterName
  });

  log.info(`Removing DNS records`);
  yield call(destroyDNS, {
    stackName: destroyConfig.clusterName,
    dnsName: "opstrace.io."
  });

  log.info(
    `Setting Bucket Lifecycle on ${lokiBucketName} to delete after 0 days`
  );
  yield call(emptyBucket, {
    bucketName: lokiBucketName
  });

  log.info(
    `Setting Bucket Lifecycle on ${lokiConfigBucketName} to delete after 0 days`
  );
  yield call(emptyBucket, {
    bucketName: lokiConfigBucketName
  });

  log.info(
    `Setting Bucket Lifecycle on ${cortexDataBucketName} to delete after 0 days`
  );
  yield call(emptyBucket, {
    bucketName: cortexDataBucketName
  });

  log.info(
    `Setting Bucket Lifecycle on ${cortexConfigBucketName} to delete after 0 days`
  );
  yield call(emptyBucket, {
    bucketName: cortexConfigBucketName
  });

  log.info(
    "GCS has been instructed to wipe the data buckets behind the scenes, " +
      "asynchronously. This process may take minutes, hours or days. After " +
      "completion, three empty GCS buckets will be left behind which you " +
      "have to delete manually: %s, %s, %s, %s",
    lokiBucketName,
    lokiConfigBucketName,
    cortexDataBucketName,
    cortexConfigBucketName
  );
}
