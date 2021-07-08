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

import useFixtures from "../fixtures";
import { restoreLogin } from "../utils";

const test = useFixtures("auth");

test.describe("after auth0 authentication", () => {
  test.beforeEach(restoreLogin);

  test.slow(
    "user should click around the entire site",
    async ({ page, user }) => {
      expect(await page.isVisible("[data-test=getting-started]")).toBeTruthy();

      await page.hover("[data-test='sidebar/tenant/Overview']");
      await page.click("[data-test='sidebar/tenant/Overview']");
      await page.click("[data-test='sidebar/tenant/Overview/Metrics']");
      await page.click("[data-test='sidebar/tenant/Overview/Logs']");
      await page.click("[data-test='sidebar/tenant/Overview']");

      await page.hover("[data-test='sidebar/tenant/Dashboards']");
      await page.click("[data-test='sidebar/tenant/Dashboards']");

      await page.hover("[data-test='sidebar/tenant/Explore']");
      await page.click("[data-test='sidebar/tenant/Explore']");

      await page.hover("[data-test='sidebar/tenant/Alerting']");
      await page.click("[data-test='sidebar/tenant/Alerting']");

      await page.hover("[data-test='sidebar/tenant/Users']");
      await page.click("[data-test='sidebar/tenant/Users']");
      expect(
        await page.isVisible(`[data-test='userList/${user.email}']`)
      ).toBeTruthy();
      await page.click("[data-test='sidebar/tenant/Users']");

      await page.hover("[data-test='sidebar/tenant/Integrations']");
      await page.click("[data-test='sidebar/tenant/Integrations']");
      await page.click("[data-test='sidebar/tenant/Integrations/All']");
      expect(
        await page.isVisible(
          `[data-test='integrations/grid/exporter-cloud-monitoring']`
        )
      ).toBeTruthy();
      await page.click("[data-test='sidebar/tenant/Integrations']");

      await page.hover("[data-test='sidebar/clusterAdmin/Health']");
      await page.click("[data-test='sidebar/clusterAdmin/Health']");
      await page.click("[data-test='sidebar/clusterAdmin/Health/System']");
      await page.click("[data-test='sidebar/clusterAdmin/Health/Metrics']");
      await page.click("[data-test='sidebar/clusterAdmin/Health/Logs']");
      await page.click("[data-test='sidebar/clusterAdmin/Health']");

      await page.hover("[data-test='sidebar/clusterAdmin/Users']");
      await page.click("[data-test='sidebar/clusterAdmin/Users']");
      expect(
        await page.isVisible(`[data-test='userList/${user.email}']`)
      ).toBeTruthy();
      await page.click("[data-test='sidebar/clusterAdmin/Users']");

      await page.hover("[data-test='sidebar/clusterAdmin/Tenants']");
      await page.click("[data-test='sidebar/clusterAdmin/Tenants']");

      await page.hover("[data-test='sidebar/clusterAdmin/Configuration']");
      await page.click("[data-test='sidebar/clusterAdmin/Configuration']");
      await page.click(
        "[data-test='sidebar/clusterAdmin/Configuration/Cortex']"
      );
      await page.hover("[data-test='sidebar/clusterAdmin/Configuration']");
    }
  );
});
