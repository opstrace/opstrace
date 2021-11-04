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
import { Tenant } from "@opstrace/tenants";
import { State } from "../reducer";

import { dbClient } from "../clickhouseClient";

const tenantPrefix = "tenant_";

export function getTenantClickHouseName(tenant: Tenant): string {
  return `${tenantPrefix}${tenant.name.replace("-", "_")}`;
}

export function* clickhouseTenantsReconciler(): Generator<
  CallEffect,
  unknown,
  unknown
> {
  return yield call(function* () {
    if (dbClient === null) {
      log.warning(
        "skipping ClickHouse tenant database/user reconciliation: CLICKHOUSE_ENDPOINT not configured"
      );
      return;
    }
    const dbClient2 = dbClient;
    let initializedGrants = false;

    while (true) {
      // loop through again in 5s
      yield delay(5 * SECOND);

      const state: State = yield select();
      if (state.tenants.list.tenants.length === 0) {
        // tenants not loaded? something's not right. wait and try again after delay
        // In particular we don't want to drop all DBs if the tenants list is missing/empty
        log.warning("skipping ClickHouse tenant sync: empty tenants list");
        continue;
      }

      if (
        !state.clickhouse.Databases.loaded ||
        !state.clickhouse.Users.loaded
      ) {
        log.debug(
          "skipping ClickHouse tenant sync: databases or users not loaded"
        );
        continue;
      }

      if (dbClient === null) {
        log.warning("skipping ClickHouse tenant sync: client became null");
        continue;
      }

      // Convert e.g. "system" => "tenant_system", "user-tenant" => "tenant_user_tenant"
      // Clickhouse does not like dashes, so we map them to underscores which are supported
      const clickhouseTenants = state.tenants.list.tenants.map(tenant =>
        getTenantClickHouseName(tenant)
      );

      const currentDBs = state.clickhouse.Databases.resources;
      const currentUsers = state.clickhouse.Users.resources;

      // Once per controller process, try to initialize grants for all DB tenant users.
      // This is to allow automatically "repairing" permissions of existing tenant users,
      // just in case the controller had just restarted at a very unlucky time when creating them.
      // This is ultimately just a best-effort attempt at repairing grants if they are missing,
      // and should be a no-op most of the time. This repair can be removed if we start checking
      // SHOW GRANTS, as mentioned below.
      let permissionsToGrant: string[] = [];
      if (!initializedGrants) {
        permissionsToGrant = clickhouseTenants.map(queryGrantUser);
        initializedGrants = true;
      }

      const dbsToAdd = clickhouseTenants
        .filter(clickhouseTenant => !currentDBs.includes(clickhouseTenant))
        .map(queryCreateDatabase);
      const usersToAdd = clickhouseTenants
        .filter(clickhouseTenant => !currentUsers.includes(clickhouseTenant))
        .flatMap(userToAdd =>
          // There is a potential bug here where the controller could exit between the
          // CREATE USER and GRANT queries, resulting in a degraded user missing permissions.
          // To fix this properly we could poll permissions using SHOW GRANTS, but parsing that would be
          // complicated. For now we somewhat punt on this, reapplying grants after a restart (above)
          // and ensuring that queries are run sequentially (below).
          // Note that the CREATE USER + GRANT unfortunately cannot be sent as a single semicolon-separated
          // query/transaction: the server returns a 'Multi-statements are not allowed' error.
          [queryCreateUser(userToAdd), queryGrantUser(userToAdd)]
        );

      // Search for users and DBs that start with 'tenant_',
      // but that aren't present in the list of expected tenants.
      // In particular we want to avoid deleting any system users/dbs.
      const usersToRemove = currentUsers
        .filter(
          curuser =>
            curuser.startsWith(tenantPrefix) &&
            !clickhouseTenants.includes(curuser)
        )
        .map(queryDropUser);
      const dbsToRemove = currentDBs
        .filter(
          curdb =>
            curdb.startsWith(tenantPrefix) && !clickhouseTenants.includes(curdb)
        )
        .map(queryDropDatabase);

      // The ordering here probably doesn't matter,
      // but it feels like DBs should only be created before (and deleted after) their associated users.
      const queries = permissionsToGrant
        .concat(dbsToAdd)
        .concat(usersToAdd)
        .concat(usersToRemove)
        .concat(dbsToRemove);

      log.debug("ClickHouse tenant sync queries to execute: %s", queries);

      // Run the queries sequentially. In theory it should be okay to run them in parallel,
      // but that introduces a potential for weird races/corner cases on ClickHouse's end.
      // Note that we MUST currently run queries in sequential order anyway, to ensure that
      // GRANT requests occur after their associated CREATE USER requests. See above comments.
      for (const query of queries) {
        try {
          yield dbClient2.query(query).toPromise();
        } catch (err: any) {
          log.error(
            "executing ClickHouse query '%s' failed (retrying in 5s): %s",
            query,
            err
          );
        }
      }
    }
  });
}

function queryCreateUser(userToCreate: string): string {
  return `CREATE USER IF NOT EXISTS ${userToCreate} IDENTIFIED WITH plaintext_password BY '${userToCreate}_password' HOST ANY DEFAULT DATABASE ${userToCreate}`;
}

function queryGrantUser(userToGrant: string): string {
  return `GRANT SELECT, INSERT, ALTER, CREATE, DROP, TRUNCATE, OPTIMIZE, SHOW ON ${userToGrant}.* TO ${userToGrant}`;
}

function queryDropUser(userToDrop: string): string {
  return `DROP USER IF EXISTS ${userToDrop}`;
}

function queryCreateDatabase(dbToCreate: string): string {
  return `CREATE DATABASE IF NOT EXISTS ${dbToCreate} ENGINE=Atomic`;
}

function queryDropDatabase(dbToDrop: string): string {
  return `DROP DATABASE IF EXISTS ${dbToDrop}`;
}
