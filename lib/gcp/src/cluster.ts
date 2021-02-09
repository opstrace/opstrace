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

import { delay, call, CallEffect } from "redux-saga/effects";

import { ApiError as GCPApiError } from "@google-cloud/common";
import { google } from "googleapis";
import {
  ClusterManagerClient as gkeClient,
  protos as gkeProtos
} from "@google-cloud/container";

import { SECOND, log } from "@opstrace/utils";
import { GKECluster, RUNNING, ERROR } from "./types";
import { generateKubeconfigStringForGkeCluster } from "./util";
import { ClusterManagerClient } from "@google-cloud/container/build/src/v1";
import { KubeConfig } from "@kubernetes/client-node";
import { getKubeConfig } from "@opstrace/kubernetes";

const container = google.container("v1");

const getLocation = (project: string, region: string, zone?: string) => {
  if (zone) {
    region = `${region}-${zone}`;
  }
  return `projects/${project}/locations/${region}`;
};

export async function getGcpProjectId(): Promise<string> {
  // Read project ID from credentials (assume credentials are set via
  // GOOGLE_APPLICATION_CREDENTIALS env var).
  return await new gkeClient().getProjectId();
}

/**
 * Check if GKE cluster exists for specific Opstrace cluster, matched via
 * opstrace_cluster_name resource tag. Return ICluster type if yes or false
 * if no.
 */
export async function doesGKEClusterExist({
  opstraceClusterName
}: {
  opstraceClusterName: string;
}): Promise<gkeProtos.google.container.v1.ICluster | false> {
  const clusters = await getAllGKEClusters();

  if (clusters) {
    for (const c of clusters) {
      const ocn = c.resourceLabels?.opstrace_cluster_name;
      if (ocn !== undefined && ocn == opstraceClusterName) {
        return c;
      }
    }
  }
  return false;
}

/**
 * Check if GKE cluster with a specific GKE cluster name exists. Return
 * ICluster type if yes or undefined if no.
 */
export async function getGKECluster(
  gkeClusterName: string
): Promise<gkeProtos.google.container.v1.ICluster | undefined> {
  const clusters = await getAllGKEClusters();

  for (const c of clusters) {
    if (c.name == gkeClusterName) {
      return c;
    }
  }
  return undefined;
}

/**
 * List all GKE clusters, across all locations (zones/regions).
 *
 * from docs: location "-" matches all zones and all regions.
 */
export async function getAllGKEClusters(): Promise<
  gkeProtos.google.container.v1.ICluster[]
> {
  const client = new gkeClient();
  const pid = await getGcpProjectId();
  const [response] = await client.listClusters({
    parent: `projects/${pid}/locations/-`
  });

  if (!response.clusters) {
    return [];
  }
  return response.clusters;
}

const createGKECluster = async (
  client: ClusterManagerClient,
  {
    name,
    cluster,
    project,
    region,
    zone
  }: {
    name: string;
    cluster: GKECluster;
    project: string;
    region: string;
    zone?: string;
  }
) => {
  const parent = getLocation(project, region, zone);
  cluster.name = name;
  log.debug("gke config:\n%s", JSON.stringify(cluster, null, 2));

  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"]
  });

  google.options({ auth });
  // use the nodejs wrapper around the google api for creation so that releaseChannel can be specified.
  // releaseChannel does not get sent with the @google-cloud/container grpc library. :sadface:
  // @ts-ignore GKECluster is not compatible with clusters create
  return container.projects.locations.clusters.create({
    parent,
    requestBody: {
      cluster,
      parent
    }
  });
  // note(jp): it's fishy that is not explicitly async
  // return client.createCluster({
  //   parent,
  //   cluster
  // });
};

async function destroyGKECluster(gkeClusterName: string, location: string) {
  const pid = await getGcpProjectId();
  const clusterpath = `projects/${pid}/locations/${location}/clusters/${gkeClusterName}`;
  log.debug("delete cluster: %s", clusterpath);
  const client = new gkeClient();

  return await client.deleteCluster({
    name: clusterpath
  });
}

export interface GKEExistsRequest {
  GKEClusterName: string;
  region: string;
  zone?: string;
  cluster: GKECluster;
  gcpProjectID: string;
}

export function* ensureGKEExists({
  GKEClusterName,
  region,
  zone,
  cluster,
  gcpProjectID
}: GKEExistsRequest): Generator<
  CallEffect,
  gkeProtos.google.container.v1.ICluster,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
> {
  const client = new gkeClient();

  while (true) {
    const existingGKECluster: gkeProtos.google.container.v1.ICluster = yield call(
      getGKECluster,
      GKEClusterName
    );

    if (!existingGKECluster) {
      try {
        yield call(createGKECluster, client, {
          name: GKEClusterName,
          project: gcpProjectID,
          region,
          zone,
          cluster
        });
      } catch (e) {
        if (e instanceof GCPApiError) {
          log.info(
            "test for JP: e instanceof GCPApiError: %s",
            JSON.stringify(e, null, 2)
          );
        }
        if (!e.code || (e.code && e.code !== 409)) {
          throw e;
        }
      }
    }
    if (existingGKECluster) {
      log.info(`GKECluster is ${existingGKECluster.status}`);
    }

    if (existingGKECluster && existingGKECluster.status === RUNNING) {
      return existingGKECluster;
    }

    if (existingGKECluster && existingGKECluster.status === ERROR) {
      throw Error("Failed to create GKE cluster");
    }

    yield delay(10 * SECOND);
  }
}

export function* ensureGKEDoesNotExist(
  opstraceClusterName: string // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Generator<unknown, void, any> {
  log.info("GKE teardown: start");

  // current convention: gke cluster name matches OCN.
  const GKEClusterName = opstraceClusterName;
  while (true) {
    const existingGKECluster: gkeProtos.google.container.v1.ICluster = yield call(
      getGKECluster,
      GKEClusterName
    );

    if (!existingGKECluster) {
      log.info("GKE teardown: desired state reached");
      return;
    }

    log.info(`GKECluster is ${existingGKECluster.status}`);

    if (existingGKECluster.status === "STOPPING") {
      yield delay(10 * SECOND);

      continue;
    }

    log.info(
      `Sleeping so Kubernetes can remove load balancers and forwarding rules`
    );
    yield delay(30 * SECOND);

    try {
      if (!existingGKECluster.location) {
        log.info(`No location for cluster %s`, GKEClusterName);
        continue;
      }
      yield call(
        destroyGKECluster,
        GKEClusterName,
        existingGKECluster.location
      );
    } catch (e) {
      if (e.code && e.code === 3) {
        log.info("grpc error 3: %s, retry", e.details);
        continue;
      }

      if (e.code && e.code === 5) {
        log.info("Got grpc error 5 (NOT_FOUND) upon delete. Done.");
        return;
      }
    }
  }
}

export async function getGKEKubeconfig(
  clusterName: string
): Promise<KubeConfig | undefined> {
  const gkeCluster = await doesGKEClusterExist({
    opstraceClusterName: clusterName
  });
  if (gkeCluster === false) {
    log.info(
      "GKE cluster corresponding to Opstrace cluster '%s' does not seem to exist.",
      clusterName
    );
    return undefined;
  }

  const kstring = generateKubeconfigStringForGkeCluster(
    await getGcpProjectId(),
    gkeCluster
  );

  // Handle the case where the cluster fails to provision. In this situation we want
  // to proceed with infrastructure cleanup anyway.
  try {
    return getKubeConfig({
      loadFromCluster: false,
      kubeconfig: kstring
    });
  } catch (e) {
    log.warning(
      "Failed to fetch kubeconfig for GKE cluster: %s. Proceeding with infraestructure cleanup.",
      e.message
    );
    return undefined;
  }
}
