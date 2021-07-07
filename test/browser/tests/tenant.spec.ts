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

  test("user can delete a Tenant", async ({ page, cluster }) => {
    const tenantName = makeTenantName();
    expect(
      await page.isVisible(`[data-test='tenant/row/${tenantName}']`)
    ).toBeFalsy();

    await createTenant(tenantName, { page });

    await page.hover("[data-test='sidebar/clusterAdmin/Tenants']");
    await page.click("[data-test='sidebar/clusterAdmin/Tenants']");

    // first, ensure clicking "no" doesn't delete the tenant
    await page.click(`[data-test='tenant/deleteBtn/${tenantName}']`);
    await page.click("[data-test='pickerService/option/no']");
    expect(
      await page.isVisible(`[data-test='tenant/row/${tenantName}']`)
    ).toBeTruthy();

    // now actually delete it
    await page.click(`[data-test='tenant/deleteBtn/${tenantName}']`);
    await page.click("[data-test='pickerService/option/yes']");
    expect(
      await page.isVisible(`[data-test='tenant/row/${tenantName}']`)
    ).toBeFalsy();
  });

  test.describe("validation of tenant name", () => {
    test("spaces are NOT allowed", async ({ page }) => {
      const tenantName = makeTenantName("tenant name");
      await createTenant(tenantName, { page });
      expect(
        await page.isVisible(`[data-test='tenant/row/${tenantName}']`)
      ).toBeFalsy();
    });

    test("dots are NOT allowed", async ({ page }) => {
      const tenantName = makeTenantName("tenant.name");
      await createTenant(tenantName, { page });
      expect(
        await page.isVisible(`[data-test='tenant/row/${tenantName}']`)
      ).toBeFalsy();
    });

    test("dashes are NOT allowed", async ({ page }) => {
      const tenantName = makeTenantName("tenant-name");
      await createTenant(tenantName, { page });
      expect(
        await page.isVisible(`[data-test='tenant/row/${tenantName}']`)
      ).toBeFalsy();
    });

    test("colons are NOT allowed", async ({ page }) => {
      const tenantName = makeTenantName("tenant:name");
      await createTenant(tenantName, { page });
      expect(
        await page.isVisible(`[data-test='tenant/row/${tenantName}']`)
      ).toBeFalsy();
    });

    test("underscores are NOT allowed", async ({ page }) => {
      const tenantName = makeTenantName("tenant_name");
      await createTenant(tenantName, { page });
      expect(
        await page.isVisible(`[data-test='tenant/row/${tenantName}']`)
      ).toBeFalsy();
    });

    test("uppcase letters are NOT allowed", async ({ page }) => {
      const tenantName = makeTenantName("tenantName");
      await createTenant(tenantName, { page });
      expect(
        await page.isVisible(`[data-test='tenant/row/${tenantName}']`)
      ).toBeFalsy();
    });

    test("can't have two with the same name", async ({ page }) => {
      const tenantName = "fancytenant";

      await createTenant(tenantName, { page });
      // deliberatly wait slightly for the system to make the Tenants, on CI it progress too fast past the following line as page.$$ doesn't wait for things
      await page.waitForSelector(`[data-test='tenant/row/${tenantName}']`, {
        timeout: 5000
      });

      // try and make another tenant with the same name, giving it 5s to appear
      await createTenant(tenantName, { page });
      await page.waitForTimeout(5_000);

      const dupTenants = await page.$$(
        `[data-test='tenant/row/${tenantName}']`
      );
      expect(dupTenants.length).toBe(1);
    });
  });
});
