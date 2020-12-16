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

import type { ChromiumBrowser } from "playwright";
import { chromium } from "playwright";

let browser: ChromiumBrowser;

suite("test UI with playwright", function () {
  suiteSetup(async function () {
    log.info("suite setup");
    globalTestSuiteSetupOnce();
    log.info("chromium.launch()");
    browser = await chromium.launch();
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

    log.info(CLUSTER_BASE_URL);
    // page.goto will throw an error if:
    // there's an SSL error (e.g. in case of self-signed certificates).
    // target URL is invalid.
    // the timeout is exceeded during navigation.
    // the remote server does not respond or is unreachable.
    // the main resource failed to load.

    log.info("page.goto()");
    await page.goto(CLUSTER_BASE_URL, {
      // Wait until the DOM load event
      waitUntil: "load"
    });

    // with the `load` event we'd get a black screenshot.
    // Waiting a little longer yields the "hit enter to log in" screen.
    await sleep(10);
    log.info("page.screenshot()");

    await page.screenshot({ path: "playwright-loginpage.png" });
  });
});
