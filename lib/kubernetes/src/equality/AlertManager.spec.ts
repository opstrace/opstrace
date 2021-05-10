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

function generateAlertManager(
  template: Partial<V1Alertmanager> = {}
): V1Alertmanager {
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
      baseImage: "my/image"
    },
    ...template
  };
}

test("should return true when spec matches and default metatada is set", () => {
  const desired = generateAlertManager({
    metadata: {
      generation: 1,
      resourceVersion: "1234",
      selfLink: "/random/string",
      uid: "randomstring"
    }
  });
  const existing = generateAlertManager({
    metadata: {
      generation: 2,
      resourceVersion: "5678",
      selfLink: "/even/more/random/string",
      uid: "evenmorerandomstring"
    }
  });
  expect(isAlertManagerEqual(desired, existing)).toBe(true);
});

test("should return false when metatada.annotations changed", () => {
  const desired = generateAlertManager({
    metadata: {
      annotations: {
        my: "old-annotation"
      }
    }
  });
  const existing = generateAlertManager({
    metadata: {
      annotations: {
        my: "new-annotation"
      }
    }
  });
  expect(isAlertManagerEqual(desired, existing)).toBe(false);
});

test("should return false when metatada.labels changed", () => {
  const desired = generateAlertManager({
    metadata: {
      labels: {
        my: "old-label"
      }
    }
  });
  const existing = generateAlertManager({
    metadata: {
      labels: {
        my: "new-label"
      }
    }
  });
  expect(isAlertManagerEqual(desired, existing)).toBe(false);
});

test("should return false when spec does not match", () => {
  const desired = generateAlertManager({
    spec: {
      baseImage: "foo"
    }
  });
  const existing = generateAlertManager({
    spec: {
      baseImage: "bar"
    }
  });

  expect(isAlertManagerEqual(desired, existing)).toBe(false);
});

test("should return true when spec matches", () => {
  const desired = generateAlertManager({
    spec: {
      baseImage: "foo"
    }
  });
  const existing = generateAlertManager({
    spec: {
      baseImage: "foo"
    }
  });

  expect(isAlertManagerEqual(desired, existing)).toBe(true);
});
