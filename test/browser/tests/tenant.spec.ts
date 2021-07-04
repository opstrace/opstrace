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

import { expect } from "@playwright/test";

import { test } from "../fixtures/authenticated";
import { logUserIn } from "../utils/authentication";

test.describe("after auth0 authentication", () => {
  test.beforeEach(logUserIn);

  test.beforeEach(async ({ page }) => {
    await page.hover("[data-test='sidebar/clusterAdmin/Tenants']");
    await page.click("[data-test='sidebar/clusterAdmin/Tenants']");
    expect(await page.isVisible("[data-test='tenant/list']")).toBeTruthy();
  });

  test("user can create a new Tenant", async ({ page, cluster }) => {
    const tenantName = `treetops${Math.floor(Math.random() * 10000)}`;
    expect(
      await page.isVisible(`[data-test='tenant/row/${tenantName}']`)
    ).toBeFalsy();

    await page.click("[data-test='tenant/addBtn']");
    expect(
      await page.isVisible("[data-test='pickerService/dialog/addTenant']")
    ).toBeTruthy();
    await page.fill(
      "[data-test='pickerService/input'] > input",
      `add tenant: ${tenantName}`
    );
    await page.click("[data-test='pickerService/option/yes']");
    expect(
      await page.waitForSelector(`[data-test='tenant/row/${tenantName}']`)
    ).toBeTruthy();

    await page.click(`[data-test='tenant/row/${tenantName}']`);
    await page.waitForURL(
      `${cluster.baseUrl}/tenant/${tenantName}/getting-started`
    );
    expect(await page.isVisible("[data-test=getting-started]")).toBeTruthy();
  });
});
