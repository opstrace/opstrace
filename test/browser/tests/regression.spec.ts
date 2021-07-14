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

const test = useFixtures(["auth"]);

test.describe("regressions we don't want to reappear", () => {
  test.describe(
    "issue #1000 - Cannot directly load 'cluster' based pages",
    () => {
      test.beforeEach(restoreLogin);

      test("check cluster tenant listing", async ({ page }) => {
        await page.hover("[data-test='sidebar/clusterAdmin/Tenants']");
        await page.click("[data-test='sidebar/clusterAdmin/Tenants']");
        expect(
          await page.waitForSelector(`[data-test='tenant/list']`)
        ).toBeTruthy();
        expect(
          await page.waitForSelector(`[data-test='tenant/row/system']`)
        ).toBeTruthy();

        // Doing this reproduced the issue prior to the fix, ie the following tests failed due to a blank page being returned
        await page.reload();

        expect(
          await page.waitForSelector(`[data-test='tenant/list']`)
        ).toBeTruthy();
        expect(
          await page.waitForSelector(`[data-test='tenant/row/system']`)
        ).toBeTruthy();
      });

      test("check cluster user listing", async ({ page, user }) => {
        await page.hover("[data-test='sidebar/clusterAdmin/Users']");
        await page.click("[data-test='sidebar/clusterAdmin/Users']");
        expect(
          await page.waitForSelector("[data-test='user/list']")
        ).toBeTruthy();
        expect(
          await page.waitForSelector(`[data-test='user/row/${user.email}']`)
        ).toBeTruthy();

        // Doing this reproduced the issue prior to the fix, ie the following tests failed due to a blank page being returned
        await page.reload();

        expect(
          await page.waitForSelector("[data-test='user/list']")
        ).toBeTruthy();
        expect(
          await page.waitForSelector(`[data-test='user/row/${user.email}']`)
        ).toBeTruthy();
      });
    }
  );
});
