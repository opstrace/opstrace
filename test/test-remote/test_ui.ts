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

import path from "path";

import {
  log,
  globalTestSuiteSetupOnce,
  CLUSTER_BASE_URL,
  TEST_REMOTE_ARTIFACT_DIRECTORY,
  sleep
} from "./testutils";

// Set debug mode for playwright, before importing it
// this does not work, too late probably. set via Makefile entrypoint
// process.env.DEBUG = "pw:api";

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
    // can be improved using the following event log:
    // pw:api => page.click started +0ms
    // pw:api waiting for selector "text=Login" +2ms
    // pw:api   selector resolved to visible <span class="MuiButton-label">Login</span> +4ms
    // pw:api attempting click action +2ms
    // pw:api   waiting for element to be visible, enabled and not moving +1ms
    // pw:api   element is visible, enabled and does not move +14ms
    // pw:api   scrolling into view if needed +0ms
    // pw:api   done scrolling +1ms
    // pw:api   checking that element receives pointer events at (556.37,459) +1ms
    // pw:api   element does receive pointer events +4ms
    // pw:api   performing click action +1ms
    // pw:api   click action done +9ms
    // pw:api   waiting for scheduled navigations to finish +0ms
    // pw:api   navigated to "https://opstrace-dev.us.auth0.com/authorize?audience=https%3A%2F%2Fuser-cluster.opstrace.io%2Fapi&scope=openid%20profile%20email%20offline_access&client_id=5MoCYfPXPuEzceBLRUr6T6SAklT2GDys&redirect_uri=https%3A%2F%2Fjp7.opstrace.io&response_type=code&response_mode=web_message&state=dFI1Y1JPUH5SVGVqdmFXeEdibUxxZjRUaDYyRk5PN3NMQzJpcmlKQVBhWg%3D%3D&nonce=U35admNuVDZ3ZzlRd25za3FMOElBRWw2Q2tqU2E3UThzMXlFdlRqRF8xRg%3D%3D&code_challenge=M2I5M1dbD022JJsdAVfq3Ap50J9NeMc8ujcE9GMjNvg&code_challenge_method=S256&prompt=none&auth0Client=eyJuYW1lIjoiYXV0aDAtcmVhY3QiLCJ2ZXJzaW9uIjoiMS4yLjAifQ%3D%3D" +478ms
    // pw:api   "load" event fired +245ms
    // pw:api   "domcontentloaded" event fired +0ms
    // pw:api   navigated to "https://opstrace-dev.us.auth0.com/login?state=g6Fo2SA2c2ExS011UXBjWkxHUE4xU2RoOE1ZZUV6dExTd0pYS6N0aWTZIDVMR1lCc3ZGYzBzVk1kWG5ldkdMYTc2YmUtNGpNR2hIo2NpZNkgNU1vQ1lmUFhQdUV6Y2VCTFJVcjZUNlNBa2xUMkdEeXM&client=5MoCYfPXPuEzceBLRUr6T6SAklT2GDys&protocol=oauth2&audience=https%3A%2F%2Fuser-cluster.opstrace.io%2Fapi&scope=openid%20profile%20email%20offline_access&redirect_uri=https%3A%2F%2Fjp7.opstrace.io%2Flogin&response_type=code&response_mode=query&nonce=c0FPNXhyMzA2OHg2ODhOTlY4YWZ2cC1ROXZmamhTajNUSWRxbHU1NTRhSg%3D%3D&code_challenge=QLiigAsWKNn8IGoKLbo2xTR8_yvRjFwDZo8Izdal3dY&code_challenge_method=S256&auth0Client=eyJuYW1lIjoiYXV0aDAtcmVhY3QiLCJ2ZXJzaW9uIjoiMS4yLjAifQ%3D%3D" +130ms
    // pw:api   navigated to "https://opstrace-dev.us.auth0.com/login?state=g6Fo2SA2c2ExS011UXBjWkxHUE4xU2RoOE1ZZUV6dExTd0pYS6N0aWTZIDVMR1lCc3ZGYzBzVk1kWG5ldkdMYTc2YmUtNGpNR2hIo2NpZNkgNU1vQ1lmUFhQdUV6Y2VCTFJVcjZUNlNBa2xUMkdEeXM&client=5MoCYfPXPuEzceBLRUr6T6SAklT2GDys&protocol=oauth2&audience=https%3A%2F%2Fuser-cluster.opstrace.io%2Fapi&scope=openid%20profile%20email%20offline_access&redirect_uri=https%3A%2F%2Fjp7.opstrace.io%2Flogin&response_type=code&response_mode=query&nonce=c0FPNXhyMzA2OHg2ODhOTlY4YWZ2cC1ROXZmamhTajNUSWRxbHU1NTRhSg%3D%3D&code_challenge=QLiigAsWKNn8IGoKLbo2xTR8_yvRjFwDZo8Izdal3dY&code_challenge_method=S256&auth0Client=eyJuYW1lIjoiYXV0aDAtcmVhY3QiLCJ2ZXJzaW9uIjoiMS4yLjAifQ%3D%3D" +0ms
    // pw:api   navigations have finished +1ms
    // pw:api <= page.click succeeded +1ms
    // pw:api   "domcontentloaded" event fired +242ms
    // pw:api   "load" event fired +1s

    // Wait for CI-specific username/pw login form to appear
    await page.waitForSelector("text=Don't remember your password?");

    await page.screenshot({
      path: artipath("playwright-after-login-click.png")
    });
  });
});
