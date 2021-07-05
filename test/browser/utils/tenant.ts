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

export const createTenant = async (
  tenantName: string,
  { page }: { page: Page }
) => {
  await page.click("[data-test='tenant/addBtn']");
  expect(
    await page.isVisible("[data-test='pickerService/dialog/addTenant']")
  ).toBeTruthy();
  await page.fill(
    "[data-test='pickerService/input'] > input",
    `add tenant: ${tenantName}`
  );
  await page.click("[data-test='pickerService/option/yes']");
};
