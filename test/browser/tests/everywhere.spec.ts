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

  // test.describe(
  //   "user should click around the entire site",
  //   async ({ page, user }) => {
  test("homepage", async ({ page }) => {
    expect(await page.isVisible("[data-test=getting-started]")).toBeTruthy();
  });

  test("tenant => overview", async ({ page }) => {
    await page.hover("[data-test='sidebar/tenant/Overview']");
    await page.click("[data-test='sidebar/tenant/Overview']");
    await page.click("[data-test='sidebar/tenant/Overview/Metrics']");
    await page.click("[data-test='sidebar/tenant/Overview/Logs']");
    await page.click("[data-test='sidebar/tenant/Overview']");
  });

  test("tenant => dashboards", async ({ page }) => {
    await page.hover("[data-test='sidebar/tenant/Dashboards']");
    await page.click("[data-test='sidebar/tenant/Dashboards']");
  });

  test("tenant => explore", async ({ page }) => {
    await page.hover("[data-test='sidebar/tenant/Explore']");
    await page.click("[data-test='sidebar/tenant/Explore']");
  });

  test("tenant => alerting", async ({ page }) => {
    await page.hover("[data-test='sidebar/tenant/Alerting']");
    await page.click("[data-test='sidebar/tenant/Alerting']");
  });

  test("tenant => users", async ({ page, user }) => {
    await page.hover("[data-test='sidebar/tenant/Users']");
    await page.click("[data-test='sidebar/tenant/Users']");
    expect(
      await page.isVisible(`[data-test='userList/${user.email}']`)
    ).toBeTruthy();
    await page.click("[data-test='sidebar/tenant/Users']");
  });

  test("tenant => integrations", async ({ page }) => {
    await page.hover("[data-test='sidebar/tenant/Integrations']");
    await page.click("[data-test='sidebar/tenant/Integrations']");
    await page.click("[data-test='sidebar/tenant/Integrations/All']");
    expect(
      await page.isVisible(
        `[data-test='integrations/grid/exporter-cloud-monitoring']`
      )
    ).toBeTruthy();
    await page.click("[data-test='sidebar/tenant/Integrations']");
  });

  test("clusterAdmin => health", async ({ page }) => {
    await page.hover("[data-test='sidebar/clusterAdmin/Health']");
    await page.click("[data-test='sidebar/clusterAdmin/Health']");
    await page.click("[data-test='sidebar/clusterAdmin/Health/System']");
    await page.click("[data-test='sidebar/clusterAdmin/Health/Metrics']");
    await page.click("[data-test='sidebar/clusterAdmin/Health/Logs']");
    await page.click("[data-test='sidebar/clusterAdmin/Health']");
  });

  test("clusterAdmin => users", async ({ page, user }) => {
    await page.hover("[data-test='sidebar/clusterAdmin/Users']");
    await page.click("[data-test='sidebar/clusterAdmin/Users']");
    expect(
      await page.isVisible(`[data-test='userList/${user.email}']`)
    ).toBeTruthy();
    await page.click("[data-test='sidebar/clusterAdmin/Users']");
  });

  test("clusterAdmin => tenants", async ({ page }) => {
    await page.hover("[data-test='sidebar/clusterAdmin/Tenants']");
    await page.click("[data-test='sidebar/clusterAdmin/Tenants']");
  });

  test("clusterAdmin => configuration", async ({ page }) => {
    await page.hover("[data-test='sidebar/clusterAdmin/Configuration']");
    await page.click("[data-test='sidebar/clusterAdmin/Configuration']");
    await page.click("[data-test='sidebar/clusterAdmin/Configuration/Cortex']");
    await page.hover("[data-test='sidebar/clusterAdmin/Configuration']");
  });
  //   }
  // );
});
