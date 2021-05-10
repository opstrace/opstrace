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

import { V1ServiceSpec } from "@kubernetes/client-node";
import { isServiceSpecEqual } from "./Service";

// mock logger
jest.mock("@opstrace/utils", () => ({
  log: {
    debug: jest.fn
  }
}));

// return an empty certificate for testing
function generateService(template: Partial<V1ServiceSpec> = {}): V1ServiceSpec {
  return {
    selector: {
      component: "redis"
    },
    ...template
  };
}

test("should return true when selector does match", () => {
  const existing = generateService();
  const desired = generateService();

  expect(isServiceSpecEqual(desired, existing)).toBe(true);
});

test("should return false when selector does not match", () => {
  const existing = generateService();
  const desired = generateService({
    selector: {
      something: "else"
    }
  });

  expect(isServiceSpecEqual(desired, existing)).toBe(false);
});
