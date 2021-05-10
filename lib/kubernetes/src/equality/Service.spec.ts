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

import { V1ServicePort, V1ServiceSpec } from "@kubernetes/client-node";
import { isServiceSpecEqual } from "./Service";

// mock logger
jest.mock("@opstrace/utils", () => ({
  log: {
    debug: jest.fn
  }
}));

function generatePort(template: Partial<V1ServicePort> = {}): V1ServicePort {
  return {
    name: "one-name",
    nodePort: 1001,
    port: 2001,
    // @ts-expect-error TS expects the targetPort to be an object, the docs indicate a number though
    targetPort: 3001,
    ...template
  };
}

// return an empty certificate for testing
function generateService(template: Partial<V1ServiceSpec> = {}): V1ServiceSpec {
  return {
    selector: {
      component: "redis"
    },
    ports: [
      generatePort({ name: "portOne" }),
      generatePort({ name: "portTwo" }),
      generatePort({ name: "portThree" })
    ],
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

test("should return true when ports does match", () => {
  const myPort = generatePort();
  const existing = generateService({ ports: [myPort] });
  const desired = generateService({ ports: [myPort] });

  expect(isServiceSpecEqual(desired, existing)).toBe(true);
});

describe("should return false when ports does not match", () => {
  it("changing amount of ports", () => {
    const existing = generateService();
    const desired = generateService();
    desired.ports = [
      generatePort({ name: "one" }),
      generatePort({ name: "two" }),
      generatePort({ name: "three" })
    ];
    desired.ports = [
      generatePort({ name: "one" }),
      generatePort({ name: "four" })
    ];

    expect(isServiceSpecEqual(desired, existing)).toBe(false);
  });
  it("different name", () => {
    const existing = generateService();
    const desired = generateService();

    existing.ports = [generatePort({ name: "old" })];
    desired.ports = [generatePort({ name: "new" })];

    expect(isServiceSpecEqual(desired, existing)).toBe(false);
  });
  it("different port", () => {
    const existing = generateService();
    const desired = generateService();

    existing.ports = [generatePort({ port: 1 })];
    desired.ports = [generatePort({ port: 2 })];

    expect(isServiceSpecEqual(desired, existing)).toBe(false);
  });
  it("different nodePort", () => {
    const existing = generateService();
    const desired = generateService();

    existing.ports = [generatePort({ nodePort: 1 })];
    desired.ports = [generatePort({ nodePort: 2 })];

    expect(isServiceSpecEqual(desired, existing)).toBe(false);
  });
  it("different targetPort", () => {
    const existing = generateService();
    const desired = generateService();

    // @ts-expect-error TS expects the targetPort to be an object, the docs indicate a number though
    existing.ports = [generatePort({ targetPort: 1 })];
    // @ts-expect-error TS expects the targetPort to be an object, the docs indicate a number though
    desired.ports = [generatePort({ targetPort: 2 })];

    expect(isServiceSpecEqual(desired, existing)).toBe(false);
  });
});
