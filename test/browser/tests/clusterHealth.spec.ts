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

test.describe("cluster health", () => {
  test.beforeEach(restoreLogin);

  test("all Cortext Ring Health tabs should render", async ({ page }) => {
    await page.hover("[data-test='sidebar/clusterAdmin/Health']");
    await page.click("[data-test='sidebar/clusterAdmin/Health']");
    await page.click("[data-test='sidebar/clusterAdmin/Health/System']");
    await page.click("[data-test='sidebar/clusterAdmin/Health/Metrics']");

    for (const tabName of [
      "Ingester",
      "Ruler",
      "Compactor",
      "Store-gateway",
      "Alertmanager"
    ]) {
      await page.click(`[data-test='ringHealth/tab/${tabName}']`);
      await page.waitForSelector(`[data-test='ringTable/shards']`);
      expect(
        await page.waitForSelector(`[data-test='ringTable/shards/row/ACTIVE']`)
      ).toBeTruthy();
    }
  });
});
