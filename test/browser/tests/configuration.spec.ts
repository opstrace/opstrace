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

import { expect, Page } from "@playwright/test";
import { format, parseISO } from "date-fns";

import useFixtures from "../fixtures";
import { restoreLogin } from "../utils";

const test = useFixtures("auth");

test.describe("configuration section", () => {
  test.beforeEach(restoreLogin);

  test("opstrace should show the correct buildinfo from server", async ({
    page,
    buildInfo
  }) => {
    await page.hover("[data-test='sidebar/clusterAdmin/Configuration']");
    await page.click("[data-test='sidebar/clusterAdmin/Configuration']");
    await page.click(
      "[data-test='sidebar/clusterAdmin/Configuration/Opstrace']"
    );

    await expectInnerTextToBe(page, buildInfo.branch, "branch");
    await expectInnerTextToBe(page, buildInfo.version, "version");
    await expectInnerTextToBe(page, buildInfo.commit, "commit");
    // await expectInnerTextToBe(
    //   page,
    //   format(parseISO(buildInfo.buildTime), "Pppp"),
    //   "buildTime"
    // );
    await expectInnerTextToBe(page, buildInfo.buildHostname, "buildHostname");
  });
});

const expectInnerTextToBe = async (page: Page, value: string, key: string) => {
  const hrefElement = await page.$(`[data-test='config/opstrace/${key}']`);
  await expect(await hrefElement.innerText()).toBe(value);
};
