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

// The purpose of this test module is to interact with the HTTP API that is
// meant for UI consumption.

import { strict as assert } from "assert";

import fs from "fs";
import path from "path";

import { ZonedDateTime } from "@js-joda/core";

import got, {
  Response as GotResponse,
  OptionsOfTextResponseBody as GotOptions
} from "got";

import { test, suite, suiteSetup } from "mocha";
import yaml from "js-yaml";

import { httpcl, mtimeDeadlineInSeconds, mtime } from "@opstrace/utils";

import {
  log,
  globalTestSuiteSetupOnce,
  enrichHeadersWithAuthToken,
  httpTimeoutSettings,
  logHTTPResponse,
  timestampToNanoSinceEpoch,
  CLUSTER_BASE_URL,
  OPSTRACE_INSTANCE_DNS_NAME,
  TEST_REMOTE_ARTIFACT_DIRECTORY,
  CI_LOGIN_EMAIL,
  CI_LOGIN_PASSWORD
} from "./testutils";

// Set debug mode for playwright, before importing it
// this does not work, too late probably. set via Makefile entrypoint
// process.env.DEBUG = "pw:api";

import type {
  ChromiumBrowser,
  Cookie,
  BrowserContext,
  Page,
  ConsoleMessage
} from "playwright";
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

async function performLoginFlowCore(page: Page) {
  // Auth0-based login flow can be slow, increase timeout. Goal:
  // Make login flow faster, reduce timeout again here.
  page.setDefaultNavigationTimeout(60_000);
  page.setDefaultTimeout(60_000);

  log.info("page.goto(%s)", CLUSTER_BASE_URL);
  await page.goto(CLUSTER_BASE_URL);
  log.info("`load` event");

  // This is supposed to wait for the "log in" button. Specifically, this:
  // <button class="MuiButtonBase-root Mui... MuiButton-sizeLarge" tabindex="0" type="button">
  // <span class="MuiButton-label">Log in</span>
  log.info('page.waitForSelector("css=button")');
  await page.waitForSelector("css=button");

  log.info("page.screenshot(), with login button");
  await page.screenshot({
    path: artipath("uishot-rootpage.png")
  });

  log.info('page.click("text=Log in")');
  await page.click("text=Log in");

  // Wait for CI-specific username/pw login form to appear
  await page.waitForSelector("text=Don't remember your password?");

  await page.fill("css=input[type=email]", CI_LOGIN_EMAIL);
  await page.fill("css=input[type=password]", CI_LOGIN_PASSWORD);

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
}

function httpClientOptsWithCookie(cookie_header_value: string) {
  return {
    throwHttpErrors: false,
    timeout: {
      connect: 5000,
      request: 30000
    },
    headers: {
      Cookie: cookie_header_value
    },
    https: { rejectUnauthorized: false }
  } as GotOptions;
}

async function waitForResp(
  url: string,
  httpopts: any,
  expectedStatusCode = 200
): Promise<GotResponse<string>> {
  const maxWaitSeconds = 2100;
  const deadline = mtimeDeadlineInSeconds(maxWaitSeconds);
  log.info(
    "Waiting for a response with status code %s to be returned by %s",
    expectedStatusCode,
    url
  );

  while (true) {
    if (mtime() > deadline) {
      throw new Error(`Expectation not fulfilled within ${maxWaitSeconds} s`);
    }

    let resp: GotResponse<string> | undefined;
    try {
      resp = await httpcl(url, httpopts);
    } catch (err: any) {
      log.info(`request failed: ${err}`);
    }

    if (resp !== undefined) {
      logHTTPResponse(resp);
      if (resp.statusCode === expectedStatusCode) {
        log.info(
          "got response with expected status code %s",
          expectedStatusCode
        );
        return resp;
      }
    }

    log.info("outer retry: try again in 10 s");
    await sleep(10);
  }
}

async function performLoginFlowWithRetry(browsercontext: BrowserContext) {
  log.info("context.newPage()");
  // Assume that newPage() call 'never' fails as of transient issues (don't put
  // into retry logic)
  const page = await browsercontext.newPage();

  const consoleLines: string[] = [];

  page.on("console", (message: ConsoleMessage) => {
    consoleLines.push(message.text());
  });

  const maxWaitSeconds = 200;
  const deadline = mtimeDeadlineInSeconds(maxWaitSeconds);
  log.info(`Trying to log in with retries, for at most ${maxWaitSeconds} s`);

  let attempt = 0;
  while (true) {
    attempt += 1;

    if (mtime() > deadline) {
      throw new Error(`Login did not succeed within ${maxWaitSeconds} s`);
    }

    // <button class="MuiButtonBase-root Mui... MuiButton-sizeLarge" tabindex="0" type="button">
    // <span class="MuiButton-label">Log in</span>
    log.info(`login attempt ${attempt}`);
    try {
      await performLoginFlowCore(page);
      break;
    } catch (err: any) {
      // It's difficult to find the 'right' way to catch "all" errors emitted
      // by Playwright. There is playwright.errors but it only knows
      // TimeoutError. What all errors seem to have in common that I have seen
      // so far is that they show the method name of the method that threw the
      // errors. In the function being called above this is always `page....`,
      // .e.g `page.waitForSelector: Timeout 60000ms exceeded.` or `page.goto:
      // net::ERR_NETWORK_CHANGED at...`.  Filter for that.
      if (!err.message.includes("page.")) {
        // This does not seem to be thrown by playwright, might be a
        // programming error. Don't consider retryable, re-throw.
        log.info("re-throw what appears to be a non-playwright error");
        throw err;
      }

      log.info(
        `page.screenshot() because of what seems to be a playwright err: ${err}`
      );

      const p = artipath(`uishot-login-err-attempt-${attempt}.png`);
      try {
        await page.screenshot({ path: p });
      } catch (innerErr: any) {
        log.warning(`ignoring error in error handler: ${innerErr}`);
      }
      log.info(`wrote screenshot to ${p}`);

      const consoleText = consoleLines.join("\n");
      const fp = artipath(`browser-console-login-err-attempt-${attempt}.log`);
      fs.writeFileSync(fp, consoleText, { encoding: "utf-8" });
      log.info(`wrote browser console content to to ${fp}`);
    }

    const consoleText = consoleLines.join("\n");
    const fp = artipath(`browser-console-after-login-success.log`);
    fs.writeFileSync(fp, consoleText, { encoding: "utf-8" });
    log.info(`wrote browser console content to to ${fp}`);

    log.info("try again in 10 s");
    await sleep(20);
  }

  log.info(
    "seems like the login flow succeeded -- look up cookies to retain authentication state"
  );
  const cookies = await browsercontext.cookies(CLUSTER_BASE_URL);
  log.info("cookies:\n%s", JSON.stringify(cookies, null, 2));

  // expose globally
  COOKIES_AFTER_LOGIN = cookies;
}

suite("test_ui_api", function () {
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

    log.info("browser.newContext()");
    await performLoginFlowWithRetry(
      await BROWSER.newContext({ ignoreHTTPSErrors: true })
    );

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

  test("test_grafana_datasource_proxy_loki_get_labels", async function () {
    assert(COOKIES_AFTER_LOGIN);

    const cookie_header_value = COOKIES_AFTER_LOGIN.map(
      c => `${c.name}=${c.value}`
    ).join("; ");

    // This relies on proxy/2 pointing to Loki. Depends on the order of
    // data sources defined in grafanaDatasources.ts
    const url = `https://system.${OPSTRACE_INSTANCE_DNS_NAME}/grafana/api/datasources/proxy/2/loki/api/v1/label`;

    const ts = ZonedDateTime.now();
    // Allow for testing clusters that started a couple of days ago
    const searchStart = ts.minusHours(100);
    const searchEnd = ts.plusHours(1);
    const queryParams = {
      start: timestampToNanoSinceEpoch(searchStart),
      end: timestampToNanoSinceEpoch(searchEnd)
    };

    const httpopts = httpClientOptsWithCookie(cookie_header_value);
    httpopts.searchParams = new URLSearchParams(queryParams);
    const resp = await waitForResp(url, httpopts);
    const r = JSON.parse(resp.body);
    if (r.data !== undefined) {
      const labels = r.data as Array<string>;
      log.info("r.data: %s", r.data);
      if (labels.includes("k8s_container_name")) {
        log.info("found `k8s_container_name` label, success");
        return;
      }
    }

    throw new Error("unexpected response");
  });

  test("test_grafana_datasource_proxy_cortex_get_rules_legacy", async function () {
    assert(COOKIES_AFTER_LOGIN);

    const cookie_header_value = COOKIES_AFTER_LOGIN.map(
      c => `${c.name}=${c.value}`
    ).join("; ");

    // This relies on proxy/1 pointing to Cortex. Depends on the order of
    // data sources defined in grafanaDatasources.ts
    // Grafana 8 accesses /rules of the Cortex ruler
    // "GET /rules HTTP/1.1" 404 21 "-" "Grafana/8.0.0"
    const url = `https://system.${OPSTRACE_INSTANCE_DNS_NAME}/grafana/api/datasources/proxy/1/rules`;

    const resp = await waitForResp(
      url,
      httpClientOptsWithCookie(cookie_header_value)
    );
    log.info("got rules doc (first 500 chars): %s", resp.body.slice(0, 500));
  });

  test("test_grafana_datasource_proxy_loki_get_rules", async function () {
    assert(COOKIES_AFTER_LOGIN);

    const cookie_header_value = COOKIES_AFTER_LOGIN.map(
      c => `${c.name}=${c.value}`
    ).join("; ");

    // This relies on proxy/2 pointing to Loki. Depends on the order of
    // data sources defined in grafanaDatasources.ts
    // Documented with "List all rules configured for the authenticated tenant"
    const url = `https://system.${OPSTRACE_INSTANCE_DNS_NAME}/grafana/api/datasources/proxy/2/loki/api/v1/rules`;

    // expect 404 response with 'no rule groups found' in body
    const resp = await waitForResp(
      url,
      httpClientOptsWithCookie(cookie_header_value),
      404
    );
    log.info("got resp with body: %s", resp.body);

    if (resp.body.includes("no rule groups found")) {
      log.info("saw expected response body, success");
      return;
    }
    throw new Error("unexpected body in 404 response");
  });

  test("test_grafana_datasource_proxy_loki_get_alerts_legacy", async function () {
    assert(COOKIES_AFTER_LOGIN);

    const cookie_header_value = COOKIES_AFTER_LOGIN.map(
      c => `${c.name}=${c.value}`
    ).join("; ");

    // This relies on proxy/2 pointing to Loki. Depends on the order of
    // data sources defined in grafanaDatasources.ts
    // GET /prometheus/api/v1/alerts
    // Prometheus-compatible rules endpoint to list all active alerts.
    const url = `https://system.${OPSTRACE_INSTANCE_DNS_NAME}/grafana/api/datasources/proxy/2/prometheus/api/v1/alerts`;
    const resp = await waitForResp(
      url,
      httpClientOptsWithCookie(cookie_header_value)
    );
    log.info("got alerts doc: %s", resp.body);
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
      throw new Error(
        "env var TENANT_RND_NAME_FOR_TESTING_ADD_TENANT is not defined but required"
      );
    }

    if (process.env.TENANT_RND_AUTHTOKEN === undefined) {
      throw new Error(
        "env var TENANT_RND_AUTHTOKEN is not defined but required"
      );
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
          `https://cortex.${tenantName}.${OPSTRACE_INSTANCE_DNS_NAME}/api/v1/labels`,
          httpopts
        );
      } catch (err: any) {
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

    const cortexRuntimeCfgUrl = `https://cortex.system.${OPSTRACE_INSTANCE_DNS_NAME}/runtime_config`; //?mode=diff`;
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
      } catch (err: any) {
        log.info(`request failed: ${err}`);
      }

      if (resp !== undefined) {
        logHTTPResponse(resp);

        if (resp.body.includes("tenantnamebar")) {
          log.info('found "tenantnamebar" in response body:\n%s', resp.body);
          log.info("success criterion, leave waiting loop");
          return;
        } else {
          log.debug(`response: ${resp.body}`);
          log.info('response does not yet contain "tenantnamebar"');
        }
      }

      log.info("outer retry: try again in 10 s");
      await sleep(10);
    }
  });
});
