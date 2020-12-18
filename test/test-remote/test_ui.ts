/**
 * Copyright 2020 Opstrace, Inc.
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

import {
  log,
  globalTestSuiteSetupOnce,
  CLUSTER_BASE_URL,
  sleep
} from "./testutils";

// Set debug mode for playwright, before importing it
process.env.DEBUG = "pw:api";

import type { ChromiumBrowser } from "playwright";
import { chromium } from "playwright";

let browser: ChromiumBrowser;

// Generate and return a path in the artifact directory
function artipath(filename: string) {
  return path.join(TEST_REMOTE_ARTIFACT_DIRECTORY, filename);
}

suite("test_ui_with_headless_browser", function () {
  suiteSetup(async function () {
    log.info("suite setup");
    globalTestSuiteSetupOnce();

    log.info("chromium.launch()");
    browser = await chromium.launch({
      args: [
        // https://github.com/microsoft/playwright/blob/761bd78879c83ed810ae38ef39513b2d874badb1/docs/ci.md#docker
        "--disable-dev-shm-usage",
        // https://github.com/microsoft/playwright/issues/4761
        "--disable-gpu"
      ]
    });

    log.info("suite setup done");
  });

  suiteTeardown(async function () {
    log.info("suite teardown");
    log.info("browser.close()");
    await browser.close();
    log.info("suite teardown done");
  });

  test("playwright", async function () {
    log.info("browser.newContext()");
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    log.info("context.newPage()");
    const page = await context.newPage();

    log.info("page.goto(%s)", CLUSTER_BASE_URL);
    await page.goto(CLUSTER_BASE_URL);
    log.info("`load` event");

    // <button class="MuiButtonBase-root Mui... MuiButton-sizeLarge" tabindex="0" type="button">
    // <span class="MuiButton-label">Login</span>
    log.info('page.waitForSelector("css=button")');
    await page.waitForSelector("css=button");

    log.info("page.screenshot()");
    await page.screenshot({
      path: artipath("playwright-loginpage.png")
    });

    log.info('page.click("text=Login")');
    await page.click("text=Login");

    // work in progress, sleep won't stay here :)
    await sleep(20);
    await page.screenshot({ path: "playwright-after-login-click.png" });
  });
});
