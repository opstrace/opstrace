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

import { test as base, expect, Page } from "@playwright/test";
import { padCharsEnd } from "ramda-adjunct";

import { addAuthFixture, addTenantFixture, pipe } from "../fixtures";

import { logUserIn } from "../utils/authentication";
import { createTenant, makeTenantName } from "../utils/tenant";

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
    test("valid alphanumeric lowercase name IS allowed", async ({ page }) => {
      const tenantName = makeTenantName("tenant5name");

      await page.click("[data-test='tenant/addBtn']");
      expect(
        await page.isVisible("[data-test='pickerService/dialog/addTenant']")
      ).toBeTruthy();
      await page.fill(
        "[data-test='pickerService/input'] > input",
        `add tenant: ${tenantName}`
      );

      expect(
        await page.isVisible("[data-test='pickerService/dialog/errorMessage']")
      ).toBeFalsy();
      expect(
        await page.isVisible("[data-test='pickerService/option/yes']")
      ).toBeTruthy();
    });

    const checkTenantNameIsNotValid = ({
      tenantName,
      rawTenantName
    }: {
      tenantName?: string;
      rawTenantName?: string;
    }) => {
      return async ({ page }: { page: Page }) => {
        await page.click("[data-test='tenant/addBtn']");
        expect(
          await page.isVisible("[data-test='pickerService/dialog/addTenant']")
        ).toBeTruthy();
        await page.fill(
          "[data-test='pickerService/input'] > input",
          `add tenant: ${rawTenantName || makeTenantName(tenantName)}`
        );

        expect(
          await page.isVisible(
            "[data-test='pickerService/dialog/errorMessage']"
          )
        ).toBeTruthy();

        expect(
          await page.isVisible("[data-test='pickerService/option/yes']")
        ).toBeFalsy();
      };
    };

    test(
      "single character names are NOT allowed",
      checkTenantNameIsNotValid({ rawTenantName: "t" })
    );

    test(
      "spaces are NOT allowed",
      checkTenantNameIsNotValid({ tenantName: "tenant name" })
    );

    test(
      "dots are NOT allowed",
      checkTenantNameIsNotValid({ tenantName: "tenant.name" })
    );

    test(
      "dashes are NOT allowed",
      checkTenantNameIsNotValid({ tenantName: "tenant-name" })
    );

    test(
      "colons are NOT allowed",
      checkTenantNameIsNotValid({ tenantName: "tenant:name" })
    );

    test(
      "underscores are NOT allowed",
      checkTenantNameIsNotValid({ tenantName: "tenant_name" })
    );

    test(
      "uppcase letters are NOT allowed",
      checkTenantNameIsNotValid({ tenantName: "tenantName" })
    );

    test(
      "is not too long",
      checkTenantNameIsNotValid({
        tenantName: padCharsEnd("toolong", 64)(makeTenantName("tenantname"))
      })
    );

    test.only("duplicate names are NOT allowed", async ({ page }) => {
      const tenantName = makeTenantName("fancytenant");

      await createTenant(tenantName, { page });
      // await page.waitForTimeout(5_000);

      console.log(tenantName);

      await checkTenantNameIsNotValid({ rawTenantName: tenantName })({ page });

      const dupTenants = await page.$$(
        `[data-test='tenant/row/${tenantName}']`
      );
      expect(dupTenants.length).toBe(1);
    });
  });
});
