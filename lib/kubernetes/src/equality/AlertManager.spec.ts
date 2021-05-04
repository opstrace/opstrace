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

import { V1Alertmanager } from "..";
import { isAlertManagerEqual } from "./AlertManager";

// mock logger
jest.mock("@opstrace/utils", () => ({
  log: {
    debug: jest.fn
  }
}));

// return an empty certificate for testing
function generateAlertManager(): V1Alertmanager {
  return {
    spec: {
      baseImage: "my/image"
    }
  };
}

test("should return false when spec does not match", () => {
  const desired = generateAlertManager();
  const existing = generateAlertManager();

  desired.spec = {
    baseImage: "foo"
  };
  existing.spec = {
    baseImage: "bar"
  };

  expect(isAlertManagerEqual(desired, existing)).toBe(false);
});

test("should return true when spec matches", () => {
  const desired = generateAlertManager();
  const existing = generateAlertManager();

  desired.spec = {
    baseImage: "foo"
  };
  existing.spec = {
    baseImage: "foo"
  };

  expect(isAlertManagerEqual(desired, existing)).toBe(true);
});
