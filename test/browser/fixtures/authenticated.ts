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

import { test as base, Cookie } from "@playwright/test";

import {
  log,
  globalTestSuiteSetupOnce,
  CLUSTER_BASE_URL,
  CLOUD_PROVIDER,
  CI_LOGIN_EMAIL,
  CI_LOGIN_PASSWORD
} from "../utils";

type ClusterFixture = {
  baseUrl: string;
  cloudProvider;
  string;
};

type UserFixture = {
  email: string;
};

type AuthenticationFixture = {
  cluster: ClusterFixture;
  user: UserFixture;
  authCookies: Cookie[];
};

// @ts-ignore: to get CI to go past the current point it's failing at to see if anything else fails
let test = base.extend<Record<string, never>, AuthenticationFixture>({
  cluster: [
    async ({ browser }, use) => {
      const user: ClusterFixture = {
        baseUrl: CLUSTER_BASE_URL,
        cloudProvider: CLOUD_PROVIDER
      };
      await use(user);
    },
    { scope: "worker" }
  ],
  user: [
    async ({ browser }, use) => {
      const user: UserFixture = {
        email: CI_LOGIN_EMAIL
      };
      await use(user);
    },
    { scope: "worker" }
  ],
  authCookies: [
    async ({ browser }, use) => {
      log.info("suite setup");
      globalTestSuiteSetupOnce();

      log.info("browser.newContext()");
      const context = await browser.newContext({ ignoreHTTPSErrors: true });
      log.info("context.newPage()");
      const page = await context.newPage();

      log.info("page.goto(%s)", CLUSTER_BASE_URL);
      await page.goto(CLUSTER_BASE_URL);
      log.info("`load` event");

      // <button class="MuiButtonBase-root Mui... MuiButton-sizeLarge" tabindex="0" type="button">
      // <span class="MuiButton-label">Log in</span>
      log.info('page.waitForSelector("css=button")');
      await page.waitForSelector("css=button");

      log.info('page.click("text=Log in")');
      await page.click("text=Log in");

      // Wait for CI-specific username/pw login form to appear
      await page.waitForSelector("text=Don't remember your password?");

      await page.fill("css=input[type=email]", CI_LOGIN_EMAIL);
      await page.fill("css=input[type=password]", CI_LOGIN_PASSWORD);

      await page.click("css=button[type=submit]");

      // The first view after successful login is expected to be the details page
      // for the `system` tenant, showing a link to Grafana.
      await page.waitForSelector("text=Getting Started");

      const cookies = await page.context().cookies();
      await page.close();

      await use(cookies);
    },
    { scope: "worker", auto: true }
  ]
});

export { test };
