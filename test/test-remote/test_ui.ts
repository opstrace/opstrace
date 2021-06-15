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

import { strict as assert } from "assert";

import path from "path";

import got, {
  Response as GotResponse,
  OptionsOfTextResponseBody as GotOptions
} from "got";

import { test, suite, suiteSetup } from "mocha";
import yaml from "js-yaml";

import {
  httpcl,
  mtimeDeadlineInSeconds,
  mtime
  //debugLogHTTPResponse,
  //debugLogHTTPResponseLight
} from "@opstrace/utils";

import {
  log,
  globalTestSuiteSetupOnce,
  enrichHeadersWithAuthToken,
  httpTimeoutSettings,
  logHTTPResponse,
  CLUSTER_BASE_URL,
  CLUSTER_NAME,
  TENANT_SYSTEM_CORTEX_API_BASE_URL,
  TEST_REMOTE_ARTIFACT_DIRECTORY
} from "./testutils";

// Set debug mode for playwright, before importing it
// this does not work, too late probably. set via Makefile entrypoint
// process.env.DEBUG = "pw:api";

import type { ChromiumBrowser, Browser, Cookie } from "playwright";
import { chromium } from "playwright";
import { sleep } from "@opstrace/utils";

let BROWSER: ChromiumBrowser;

// Generate and return a path in the artifact directory
function artipath(filename: string) {
  return path.join(TEST_REMOTE_ARTIFACT_DIRECTORY, filename);
}

// A data structure like this:
// 2021-05-05T12:16:05.105Z info: cookies:
// [
//   {
//     "sameSite": "None",
//     "name": "_legacy_auth0.is.authenticated",
//     "value": "true",
//     "domain": "jpload-1620131593.opstrace.io",
//     "path": "/",
//     "expires": 1620303358,
//     "httpOnly": false,
//     "secure": true
//   },
//   {
// ...
// ]
let COOKIES_AFTER_LOGIN: Cookie[] | undefined;

async function performLoginFlow(br: Browser) {
  log.info("browser.newContext()");
  const context = await br.newContext({ ignoreHTTPSErrors: true });
  log.info("context.newPage()");
  const page = await context.newPage();

  log.info("page.goto(%s)", CLUSTER_BASE_URL);
  await page.goto(CLUSTER_BASE_URL);
  log.info("`load` event");

  // <button class="MuiButtonBase-root Mui... MuiButton-sizeLarge" tabindex="0" type="button">
  // <span class="MuiButton-label">Log in</span>
  log.info('page.waitForSelector("css=button")');
  await page.waitForSelector("css=button");

  log.info("page.screenshot()");
  await page.screenshot({
    path: artipath("uishot-rootpage.png")
  });

  log.info('page.click("text=Log in")');
  await page.click("text=Log in");

  // Wait for CI-specific username/pw login form to appear
  await page.waitForSelector("text=Don't remember your password?");

  await page.fill("css=input[type=email]", "ci-test@opstrace.com");
  await page.fill("css=input[type=password]", "This-is-not-a-secret!");

  await page.screenshot({
    path: artipath("uishot-auth0-login-page.png")
  });

  await page.click("css=button[type=submit]");

  // The first view after successful login is expected to be the details page
  // for the `system` tenant, showing a link to Grafana.
  await page.waitForSelector("text=Getting Started");

  await page.screenshot({
    path: artipath("uishot-after-auth0-login.png")
  });

  const cookies = await context.cookies(CLUSTER_BASE_URL);
  log.info("cookies:\n%s", JSON.stringify(cookies, null, 2));

  // expose globally
  COOKIES_AFTER_LOGIN = cookies;
}

suite("test_ui_with_headless_browser", function () {
  suiteSetup(async function () {
    log.info("suite setup");
    globalTestSuiteSetupOnce();

    log.info("chromium.launch()");
    BROWSER = await chromium.launch({
      // headless: false, // set to false to see browser on your desktop
      args: [
        // https://github.com/microsoft/playwright/blob/761bd78879c83ed810ae38ef39513b2d874badb1/docs/ci.md#docker
        "--disable-dev-shm-usage",
        // https://github.com/microsoft/playwright/issues/4761
        "--disable-gpu"
      ]
    });

    await performLoginFlow(BROWSER);

    // Perform login flow in setup, so that the authentications state (namely,
    // cookies), can be re-used in individual tests.

    log.info("suite setup done");
  });

  suiteTeardown(async function () {
    log.info("suite teardown");
    log.info("browser.close()");
    await BROWSER.close();
    log.info("suite teardown done");
  });

  test("create_tenant_and_use_custom_authn_token", async function () {
    // Note(JP): pragmatic first step: synthetically emit HTTP request with
    // `got`, do not actually let the browser emit it. That was easier to
    // implement than navigating the browser (complications: the PLUS icon for
    // tenants does not have a distinct css class or property set, etc). Use
    // the suiteSetup() here to obtain valid authentication state, and then
    // reuse that state by sending all relevant cookies. Note that technically
    // the test_ui.ts was/is meant to do only _actual_ browser interaction.
    // This test here isn't doing that. It's in here for now for dependency
    // management: using the state created by setupSuite(). It's also in here
    // so that it can be replaced by the UI-based flow for creating the tenant!
    assert(COOKIES_AFTER_LOGIN);

    if (process.env.TENANT_RND_NAME_FOR_TESTING_ADD_TENANT === undefined) {
      log.info(
        "skip, process.env.TENANT_RND_NAME_FOR_TESTING_ADD_TENANT not defined"
      );
      return this.skip();
    }

    if (process.env.TENANT_RND_AUTHTOKEN === undefined) {
      log.info("skip, process.env.TENANT_RND_AUTHTOKEN not defined");
      return this.skip();
    }

    const tenantName = process.env.TENANT_RND_NAME_FOR_TESTING_ADD_TENANT;
    const tenantAuthToken = process.env.TENANT_RND_AUTHTOKEN;
    log.info("create tenant with name %s", tenantName);

    const cookie_header_value = COOKIES_AFTER_LOGIN.map(
      c => `${c.name}=${c.value}`
    ).join("; ");

    log.info("cookie header value: %s", cookie_header_value);

    const url = `${CLUSTER_BASE_URL}/_/graphql`;
    const headers = {
      "Content-Type": "application/json",
      Cookie: cookie_header_value
    };

    const bodyObj = {
      query:
        "mutation CreateTenants($tenants: [tenant_insert_input!]!) {\n  insert_tenant(objects: $tenants) {\n    returning {\n      name\n    }\n  }\n}\n",
      variables: {
        tenants: [
          {
            name: tenantName
          }
        ]
      }
    };

    const response = await got.post(url, {
      body: JSON.stringify(bodyObj, null, 2),
      throwHttpErrors: false,
      headers: headers,
      timeout: httpTimeoutSettings,
      https: { rejectUnauthorized: false } // skip tls cert verification
    });

    logHTTPResponse(response);
    assert.strictEqual(response.statusCode, 200);

    // GraphQL: 200 OK response does not mean that no error happened.
    const rdata = JSON.parse(response.body);
    assert(rdata.errors === undefined);

    log.info("using tenant auth token: %s", tenantAuthToken);

    const httpopts: GotOptions = {
      method: "GET",
      // Some HTTP error responses are expected. Do this handling work manually.
      throwHttpErrors: false,
      headers: { Authorization: `Bearer ${tenantAuthToken}` },
      timeout: httpTimeoutSettings,
      https: { rejectUnauthorized: false } // skip tls cert verification
    };

    const maxWaitSeconds = 2100;
    const deadline = mtimeDeadlineInSeconds(maxWaitSeconds);
    log.info(
      "Waiting for API for new tenant to become available, deadline in %ss",
      maxWaitSeconds
    );

    while (true) {
      if (mtime() > deadline) {
        throw new Error(`Expectation not fulfilled within ${maxWaitSeconds} s`);
      }

      let resp: GotResponse<string> | undefined;
      try {
        resp = await httpcl(
          `https://cortex.${tenantName}.${CLUSTER_NAME}.opstrace.io/api/v1/labels`,
          httpopts
        );
      } catch (err) {
        log.info(`request failed: ${err}`);
      }

      if (resp !== undefined) {
        logHTTPResponse(resp);
        if (resp.statusCode === 200) {
          return;
        }
      }

      log.info("outer retry: try again in 10 s");
      await sleep(10);
    }
  });

  test("test_submit_cortex_runtime_config", async function () {
    // Same consideration as above: this test is here in this module for now
    // just because it's easy to use the authentication state after actual
    // UI-based login.
    assert(COOKIES_AFTER_LOGIN);

    const cookie_header_value = COOKIES_AFTER_LOGIN.map(
      c => `${c.name}=${c.value}`
    ).join("; ");

    log.info("cookie header value: %s", cookie_header_value);

    const url = `${CLUSTER_BASE_URL}/_/cortex/runtime_config`;
    const headers = {
      "Content-Type": "text/plain", // for bodyParser.text() express middleware
      Cookie: cookie_header_value
    };

    const bodyObj = {
      overrides: {
        tenantnamefoo: {
          ingestion_rate: 10000
        },
        tenantnamebar: {
          ingestion_rate: 10000
        }
      }
    };

    const response = await got.post(url, {
      body: yaml.dump(bodyObj),
      throwHttpErrors: false,
      headers: headers,
      timeout: httpTimeoutSettings,
      https: { rejectUnauthorized: false } // skip tls cert verification
    });

    logHTTPResponse(response);

    const maxWaitSeconds = 240;
    const deadline = mtimeDeadlineInSeconds(maxWaitSeconds);
    log.info(
      "Waiting for Cortex runtime config to reflect change, deadline in %ss",
      maxWaitSeconds
    );

    const cortexRuntimeCfgUrl = `${TENANT_SYSTEM_CORTEX_API_BASE_URL}/runtime_config`; //?mode=diff`;
    // This is exposed through a proxy to
    //const cortexRuntimeCfgUrl = `${CLUSTER_BASE_URL}/_/cortex/runtime_config`;
    const httpopts: GotOptions = {
      method: "GET",
      // Some HTTP error responses are expected. Do this handling work manually.
      throwHttpErrors: false,
      headers: enrichHeadersWithAuthToken(cortexRuntimeCfgUrl, {}),
      //headers: { Cookie: cookie_header_value },
      timeout: httpTimeoutSettings,
      https: { rejectUnauthorized: false } // skip tls cert verification
    };

    while (true) {
      if (mtime() > deadline) {
        throw new Error(`Expectation not fulfilled within ${maxWaitSeconds} s`);
      }

      let resp: GotResponse<string> | undefined;
      try {
        resp = await httpcl(cortexRuntimeCfgUrl, httpopts);
      } catch (err) {
        log.info(`request failed: ${err}`);
      }

      if (resp !== undefined) {
        logHTTPResponse(resp);

        if (resp.body.includes("tenantnamebar")) {
          log.info('found "tenantnamebar" in response body:\n%s', resp.body);
          log.info("success criterion, leave waiting loop");
          return;
        } else {
          log.info(
            'response does not yet contain "tenantnamebar:\n%s',
            resp.body
          );
        }
      }

      log.info("outer retry: try again in 10 s");
      await sleep(10);
    }
  });

  test("view_ring_health", async function () {
    // Same consideration as above: this test is here in this module for now
    // just because it's easy to use the authentication state after actual
    // UI-based login.
    assert(COOKIES_AFTER_LOGIN, "Auth cookies are present");
    const page = await BROWSER.contexts()[0].newPage();
    await page.goto(CLUSTER_BASE_URL);
    await page.waitForNavigation();

    await page.click("text=Health");
    await page.click("text=Metrics");
    assert(await page.isVisible("text=Cortex Ring Health"), "page loaded");

    for (const tabName of [
      "Ingester",
      "Ruler",
      "Compactor",
      "Store-gateway",
      "Alertmanager"
    ]) {
      await page.click(`text=${tabName}`);
      page.waitForSelector(`css=tab >> text=${tabName} [aria-selected="true"]`);
      assert(
        await page.waitForSelector("text=less than a minute ago"),
        `Loading ${tabName} table`
      );
    }
  });
});
