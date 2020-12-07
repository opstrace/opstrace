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

import { KubeConfig } from "@kubernetes/client-node";
import { set as updateTenants, Tenants } from "@opstrace/tenants";
import dbClient, { ClientResponse } from "../dbClient";
import { State } from "../reducer";
import { log, SECOND } from "@opstrace/utils";

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
    while (true) {
      try {
        const state: State = yield select();
        const existingTenants = state.tenants.list.tenants;

        const res: ClientResponse<typeof dbClient.GetTenants> = yield call(
          dbClient.GetTenants
        );
        const tenants = res.data?.tenant;
        if (!tenants) {
          // this case should never happen because the request would throw an error status
          throw Error("res.data.tenant doesn't exist in response");
        }
        if (tenants.length === 0) {
          log.info("no tenants found in db, syncing existing tenants to db");
          // Because we always have tenants, a zero length array here means we've never reconciled
          // the tenants created during install with the db. So let's sync the existingTenants
          // to the db.
          yield call(dbClient.CreateTenants, {
            tenants: existingTenants.map(t => ({
              name: t.name,
              type: t.type
            }))
          });
        } else {
          // check for changes
          const existingTenantNames = existingTenants.map(t => t.name);
          const tenantNames = tenants.map(t => t.name);
          if (
            existingTenantNames.length !== tenantNames.length ||
            tenantNames
              .map(t => !existingTenantNames.includes(t))
              .find(notFound => notFound)
          ) {
            log.info("tenant config changed in db, new: %s", tenants);
            log.info("tenant config changed in db, old: %s", existingTenants);
            // sync
            yield call(
              updateTenants,
              tenants.map(t => ({
                name: t.name,
                type: t.type === "SYSTEM" ? "SYSTEM" : "USER"
              })) as Tenants,
              kubeConfig
            );
          }
        }
      } catch (err) {
        log.error(
          "could not read/write from/to db during tenant sync, retrying in 2s: %s",
          err
        );
      }
      // loop through again in 5s
      yield delay(5 * SECOND);
    }
  });
}
