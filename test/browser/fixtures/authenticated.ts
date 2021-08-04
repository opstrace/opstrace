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

import { Cookie, TestType } from "@playwright/test";
import fs from "fs";

import { performLogin, log } from "../utils";

type AuthenticationFixture = {
  authCookies: Cookie[];
};

export const addAuthFixture = (test: TestType) =>
  test.extend<Record<string, never>, AuthenticationFixture>({
    authCookies: [
      async ({ browser, system, cluster, user }, use) => {
        if (system.workerAuth) {
          const SAVE_STATE =
            process.env.OPSTRACE_PLAYWRIGHT_SAVE_STATE === "true";
          const STATE_FILENAME = "contextState.json";
          const statePresent = SAVE_STATE && fs.existsSync(STATE_FILENAME);

          const context = await browser.newContext({
            ignoreHTTPSErrors: true,
            storageState: statePresent ? STATE_FILENAME : undefined
          });
          const page = await context.newPage();

          if (!statePresent) {
            await performLogin({ page, cluster, user });
            if (SAVE_STATE)
              await context.storageState({ path: "contextState.json" });
          }

          const cookies = await page.context().cookies();
          await page.close();

          await use(cookies);
        } else await use(null);
      },
      { scope: "worker", auto: true }
    ]
  });
