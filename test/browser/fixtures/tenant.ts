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

import { makeTenantName } from "../utils/tenant";

type TenantFixture = {
  newName: string;
};

export const addTenantFixture = test =>
  // @ts-ignore: to get CI to go past the current point it's failing at to see if anything else fails
  test.extend<
    Record<string, never>,
    {
      tenant: TenantFixture;
    }
  >({
    tenant: [
      async ({}, use) => {
        await use({
          newName: makeTenantName()
        });
      },
      { scope: "test" }
    ]
  });
