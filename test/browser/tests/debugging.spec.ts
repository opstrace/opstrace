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

import { addAuthFixture } from "../fixtures";
import { logUserIn } from "../utils/authentication";

import {
  CLUSTER_BASE_URL,
  CI_LOGIN_EMAIL,
  CI_LOGIN_PASSWORD
} from "../fixtures/authenticated";

const testWithAuth = addAuthFixture(base);
const testNoAuth = base;

testWithAuth.describe("debugging", () => {
  testWithAuth.beforeEach(logUserIn);

  testWithAuth("this should FAIL all the time", async ({ page }) => {
    testWithAuth.skip();
    expect(false).toBeTruthy();
  });
});

testNoAuth.describe("debugging - no auth", () => {
  testNoAuth("can I manually login this way?", async ({ page }) => {
    testNoAuth.skip();
    await page.goto(CLUSTER_BASE_URL);

    // <button class="MuiButtonBase-root Mui... MuiButton-sizeLarge" tabindex="0" type="button">
    // <span class="MuiButton-label">Log in</span>
    await page.waitForSelector("css=button");

    await page.click("text=Log in");

    // Wait for CI-specific username/pw login form to appear
    await page.waitForSelector("text=Don't remember your password?");

    await page.fill("css=input[type=email]", CI_LOGIN_EMAIL);
    await page.fill("css=input[type=password]", CI_LOGIN_PASSWORD);

    await page.click("css=button[type=submit]");

    // The first view after successful login is expected to be the details page
    // for the `system` tenant, showing a link to Grafana.
    await page.waitForSelector("[data-test=getting-started]");

    expect(await page.isVisible("[data-test=getting-started]")).toBeTruthy();
  });
});
