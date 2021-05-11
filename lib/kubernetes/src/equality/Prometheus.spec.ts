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

import { V1Prometheus } from "..";
import { isPrometheusEqual } from "./Prometheus";

// mock logger
jest.mock("@opstrace/utils", () => ({
  log: {
    debug: jest.fn
  }
}));

// return an empty certificate for testing
function generatePrometheus(
  template: Partial<V1Prometheus> = {}
): V1Prometheus {
  return {
    metadata: {
      /* start default metadata */
      generation: 1,
      resourceVersion: "1234",
      selfLink: "/random/string",
      uid: "randomstring",
      /* end default metadata */
      annotations: {
        some: "annotation"
      },
      labels: {
        some: "label"
      }
    },
    spec: {
      image: "my/image"
    },
    ...template
  };
}

test("should return true when spec matches and default metatada is set", () => {
  const desired = generatePrometheus({
    metadata: {
      generation: 1,
      resourceVersion: "1234",
      selfLink: "/random/string",
      uid: "randomstring"
    }
  });
  const existing = generatePrometheus({
    metadata: {
      generation: 2,
      resourceVersion: "5678",
      selfLink: "/even/more/random/string",
      uid: "evenmorerandomstring"
    }
  });
  expect(isPrometheusEqual(desired, existing)).toBe(true);
});

test("should return false when spec does not match", () => {
  const desired = generatePrometheus();
  const existing = generatePrometheus();

  desired.spec = {
    baseImage: "foo"
  };
  existing.spec = {
    baseImage: "bar"
  };

  expect(isPrometheusEqual(desired, existing)).toBe(false);
});

test("should return true when spec matches", () => {
  const desired = generatePrometheus();
  const existing = generatePrometheus();

  desired.spec = {
    baseImage: "foo"
  };
  existing.spec = {
    baseImage: "foo"
  };

  expect(isPrometheusEqual(desired, existing)).toBe(true);
});
