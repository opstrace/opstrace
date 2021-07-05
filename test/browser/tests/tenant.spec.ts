/**
 * Copyright 2021 Opstrace, Inc.
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

import { test as base, expect } from "@playwright/test";

import { addAuthFixture, addTenantFixture, pipe } from "../fixtures";

import { logUserIn } from "../utils/authentication";
import { createTenant, makeTenantName } from "../utils/tenant";

import { log } from "../utils";

const test = pipe(addAuthFixture, addTenantFixture)(base);

test.describe("after auth0 authentication", () => {
  test.beforeEach(logUserIn);

  test.beforeEach(async ({ page }) => {
    await page.hover("[data-test='sidebar/clusterAdmin/Tenants']");
    await page.click("[data-test='sidebar/clusterAdmin/Tenants']");
    expect(await page.isVisible("[data-test='tenant/list']")).toBeTruthy();
  });

  test("user can create a new Tenant", async ({ page, cluster, tenant }) => {
    const tenantName = makeTenantName();
    expect(
      await page.isVisible(`[data-test='tenant/row/${tenantName}']`)
    ).toBeFalsy();

    await createTenant(tenantName, { page });

    expect(
      await page.waitForSelector(`[data-test='tenant/row/${tenantName}']`)
    ).toBeTruthy();

    await page.click(`[data-test='tenant/row/${tenantName}']`);
    await page.waitForURL(
      `${cluster.baseUrl}/tenant/${tenantName}/getting-started`
    );
    expect(await page.isVisible("[data-test=getting-started]")).toBeTruthy();
  });

  // test("user can delete a new Tenant", async ({ page, cluster, hello }) => {
  // });

  test.describe("validation of tenant name", () => {
    test("user can create a new Tenant", async ({ page, cluster, tenant }) => {
      const tenantName = makeTenantName();
      await createTenant(tenantName, { page });
    });
  });
});
