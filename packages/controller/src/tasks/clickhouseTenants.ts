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

import { log, SECOND } from "@opstrace/utils";
import { State } from "../reducer";

import { dbClient } from "../clickhouseClient";

export function* clickhouseTenantsReconciler(): Generator<
  CallEffect,
  unknown,
  unknown
> {
  return yield call(function* () {
    if (dbClient === null) {
      log.info(
        "disabled clickhouse tenants reconciliation: CLICKHOUSE_URL not configured"
      );
      return;
    }
    const dbClient2 = dbClient;

    while (true) {
      // loop through again in 5s
      yield delay(5 * SECOND);

      const state: State = yield select();
      const tenants = state.tenants.list.tenants;
      if (tenants.length === 0) {
        // tenants not loaded? something's not right. wait and try again after delay
        log.warning(
          "skipping clickhouse tenants sync: missing tenants in configmap"
        );
        continue;
      }

      if (
        !state.clickhouse.Databases.loaded ||
        !state.clickhouse.Users.loaded
      ) {
        log.debug(
          "skipping clickhouse tenants sync: databases or users not loaded"
        );
        continue;
      }

      if (dbClient === null) {
        log.warning("skipping clickhouse tenants sync: client became null");
        continue;
      }

      // Convert e.g. "system" => "tenant_system", "user-tenant" => "tenant_user_tenant"
      // Clickhouse does not support dashes, so we map them to underscores which are supported
      const clickhouseTenants = tenants.map(
        tenant => `tenant_${tenant.name.replace("-", "_")}`
      );

      const currentDBs = state.clickhouse.Databases.resources;
      const currentUsers = state.clickhouse.Users.resources;

      const dbsToAdd = clickhouseTenants
        .filter(tenant => !currentDBs.includes(tenant))
        .map(
          dbToAdd => `CREATE DATABASE IF NOT EXISTS ${dbToAdd} ENGINE=Atomic`
        );
      const usersToAdd = clickhouseTenants
        .filter(tenant => !currentUsers.includes(tenant))
        .flatMap(userToAdd => [
          `CREATE USER IF NOT EXISTS ${userToAdd} IDENTIFIED WITH plaintext_password BY '${userToAdd}_password' HOST ANY DEFAULT DATABASE ${userToAdd}`,
          `GRANT SELECT, INSERT, ALTER, CREATE, DROP, TRUNCATE, OPTIMIZE, SHOW ON ${userToAdd}.* TO ${userToAdd}`
        ]);

      const usersToRemove = currentUsers
        .filter(curuser => !clickhouseTenants.includes(curuser))
        .map(dbToRemove => `DROP USER IF EXISTS ${dbToRemove}`);
      const dbsToRemove = currentDBs
        .filter(curdb => !clickhouseTenants.includes(curdb))
        .map(dbToRemove => `DROP DATABASE IF EXISTS ${dbToRemove}`);

      const queries = dbsToAdd
        .concat(usersToAdd)
        .concat(usersToRemove)
        .concat(dbsToRemove);

      log.debug("clickhouse sync queries to execute: %s", queries);

      try {
        yield Promise.all(
          [...queries].map(query => dbClient2.query(query).toPromise())
        );
      } catch (err: any) {
        log.error("failed syncing clickhouse dbs/users: %s", err);
      }
    }
  });
}
