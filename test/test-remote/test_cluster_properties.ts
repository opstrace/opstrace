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

import got from "got";
import {
  log,
  logHTTPResponse,
  globalTestSuiteSetupOnce,
  CLUSTER_BASE_URL
} from "./testutils";

suite("basic cluster properties", function () {
  suiteSetup(async function () {
    log.info("suite setup");
    globalTestSuiteSetupOnce();
  });

  suiteTeardown(async function () {
    log.info("suite teardown");
  });

  test("GET / and follow redirects and inspect HTML", async function () {
    log.info("GET %s and follow redirects", CLUSTER_BASE_URL);
    const response = await got(CLUSTER_BASE_URL, {
      throwHttpErrors: false,
      followRedirect: true,
      https: { rejectUnauthorized: false },
      timeout: {
        connect: 10000,
        request: 60000
      }
    });

    logHTTPResponse(response);

    if (response.statusCode == 200 && response.body) {
      const needle = "<title>Opstrace</title>";
      if (response.body.includes(needle)) {
        log.info("found needle in HTML: %s", needle);
        return;
      }
    }

    throw new Error("didn't see expected HTML");
  });
});
