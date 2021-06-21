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

  test("user should see homepage", async ({ page }) => {
    expect(await page.isVisible("[data-test=getting-started]")).toBeTruthy();
  });

  test.only("user should see own email in user list", async ({
    page,
    user
  }) => {
    await page.hover("[data-test='sidebar/Users']");
    await page.click("[data-test='sidebar/Users']");
    expect(
      await page.isVisible(`[data-test='userList/${user.email}']`)
    ).toBeTruthy();
  });
});
