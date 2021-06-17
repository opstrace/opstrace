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

import { call, delay, select, CallEffect } from "redux-saga/effects";
import { equals } from "ramda";

import { KubeConfig } from "@kubernetes/client-node";
import { set as updateTenants, Tenants } from "@opstrace/tenants";
import dbClient, { ClientResponse } from "../dbClient";
import { State } from "../reducer";
import { log, SECOND } from "@opstrace/utils";
import axios, { AxiosResponse } from "axios";

// Make this optional, so that running the controller locally during dev
// doesn't require a connection to the service.
const alertmanagerEndpoint = process.env.ALERTMANAGER_ENDPOINT ?? "";

function* setDefaultAlertmanagerConfigIfEmpty(endpoint: string, tenant: string) {
  try {
    const res: AxiosResponse<string> = yield axios({
      url: endpoint,
      method: "GET",
      headers: {
        "X-Scope-OrgID": tenant
      }
    });

    if (res.status === 200) {
      // Already has config set
      return;
    }
  } catch (err) {
    if (!err.response) {
      log.error(
        `could not read alertmanager config for tenant: ${tenant}, got unknown error: %s`,
        err
      );
      return;
    }
    // Cortex will return a 404 if config hasn't been set for this tenant already, so
    // we want to continue on if we get a 404
    if (err.response.status != 404) {
      // Don't risk overwriting existing config
      log.error(
        `could not read alertmanager config for tenant: ${tenant}, got resp: ${
          err.response.status
        }, ${err.response.data.slice(0, 500)}...` // truncate to the first 500 chars as a maximum
      );
      return;
    }
  }

  try {
    yield axios({
      url: endpoint,
      method: "POST",
      headers: {
        "X-Scope-OrgID": tenant
      },
      data: `alertmanager_config: |
  route:
    receiver: default-receiver
    group_wait: 30s
    group_interval: 5m
    repeat_interval: 4h
    group_by: [alertname]
  receivers:
    - name: default-receiver
`
    });
    log.info(`successfully set default alertmanager config ${tenant} tenant`);
  } catch (err) {
    log.error(
      `could not write default alertmanager config to ${tenant} tenant: %s`,
      err
    );
  }
}

export function* syncTenants(
  kubeConfig: KubeConfig
): Generator<CallEffect, unknown, unknown> {
  return yield call(function* () {
    if (!dbClient) {
      log.warning(
        "exiting tenant sync due to missing env vars GRAPHQL_ENDPOINT & HASURA_GRAPHQL_ADMIN_SECRET"
      );
      return;
    }
    // In the lifespan of a cluster, this does the following:
    // 0. The installer writes the list of tenant names/types to a ConfigMap.
    // 1a. When the controller is first run, the sync detects that GraphQL is empty and syncs from the ConfigMap to GraphQL.
    //     After this initial sync, all syncing is from GraphQL back to the ConfigMap for the lifetime of the cluster.
    // 1b. The initial tenants are assigned UUIDs by GraphQL automatically, and those are synced back to the ConfigMap.
    // 2. Later, when new tenants are added via the UI to GraphQL, they are synced from GraphQL back to the ConfigMap.
    while (true) {
      try {
        const state: State = yield select();
        const configmapTenants = state.tenants.list.tenants;

        const res: ClientResponse<typeof dbClient.GetTenants> = yield call(
          dbClient.GetTenants
        );
        const dbTenants = res.data?.tenant;
        if (!dbTenants) {
          // this case should never happen because the request would throw an error status
          throw Error("res.data.tenant doesn't exist in response");
        }
        if (dbTenants.length === 0) {
          log.info(
            "no tenants found in db, syncing existing tenants to db: %s",
            JSON.stringify(configmapTenants)
          );
          // Because we always have tenants, a zero length array here means we've never reconciled
          // the tenants created during install with the db. So let's sync the existingTenants
          // from the ConfigMap to GraphQL. This should only occur once for any opstrace cluster.

          // We just write the name and type of each tenant.
          // The database will assign an ID automatically, and we will pick up that ID via the next sync.
          const tenants = configmapTenants.map(t => ({
            name: t.name,
            type: t.type,
            // Try to pass IDs, even though they should normally be null.
            // If the IDs are null, GraphQL will assign IDs automatically.
            // If they are non-null in the ConfigMap (e.g. maybe someone manually deleted the tenants from GraphQL after a prior sync?),
            // then ensure GraphQL DOESN'T assign new IDs.
            id: t.id
          }));
          yield call(dbClient.CreateTenants, {
            tenants
          });
        } else {
          // Sync changes from GraphQL back into the ConfigMap, which will update our local state in the process.
          // If GraphQL has IDs for the tenants, this adds the IDs to the ConfigMap as well, which is then reflected in the controller state object.
          // We also sort the tenants so that they are compared and written to the ConfigMap with a consistent ordering.
          const dbTenantsState = dbTenants
            .map(t => ({
              name: t.name,
              id: t.id,
              type: t.type === "SYSTEM" ? "SYSTEM" : "USER"
            }))
            .sort((t1, t2) => t1.name.localeCompare(t2.name)) as Tenants;

          if (!equals(dbTenantsState, configmapTenants)) {
            log.info(
              "tenant config changed in db: old=%s new=%s",
              JSON.stringify(configmapTenants),
              JSON.stringify(dbTenantsState)
            );
            // Write the new tenant list to the ConfigMap.
            // When the update takes effect, the controller State will be updated via the K8s client subscription.
            yield call(updateTenants, dbTenantsState, kubeConfig);
          }

          if (alertmanagerEndpoint !== "") {
            for (const tenant of dbTenantsState) {
              yield call(setDefaultAlertmanagerConfigIfEmpty, alertmanagerEndpoint, tenant.name);
            }
          }
        }
      } catch (err) {
        log.error(
          "could not read/write from/to db during tenant sync, retrying in 5s: %s",
          err
        );
      }
      // loop through again in 5s
      yield delay(5 * SECOND);
    }
  });
}
