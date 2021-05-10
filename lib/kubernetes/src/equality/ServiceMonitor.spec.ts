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

import { V1Servicemonitor } from "..";
import { isServiceMonitorEqual } from "./ServiceMonitor";

// mock logger
jest.mock("@opstrace/utils", () => ({
  log: {
    debug: jest.fn
  }
}));

type Endpoint = V1Servicemonitor["spec"]["endpoints"][number];
function generateEndpoint(template: Partial<Endpoint> = {}): Endpoint {
  return {
    interval: "1",
    port: "web",
    path: "/test",
    ...template
  };
}

// return an empty certificate for testing
function generateServiceMonitor(
  template: Partial<V1Servicemonitor> = {}
): V1Servicemonitor {
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
      jobLabel: "my-job-label",
      selector: {
        matchLabels: {
          app: "prometheus"
        },
        component: "redis"
      },
      endpoints: [
        generateEndpoint({ path: "one" }),
        generateEndpoint({ path: "two" }),
        generateEndpoint({ path: "three" })
      ]
    },
    ...template
  };
}

test("should return true when service monitor does match", () => {
  const existing = generateServiceMonitor();
  const desired = generateServiceMonitor();

  expect(isServiceMonitorEqual(desired, existing)).toBe(true);
});

test("should return true when spec matches and default metatada is set", () => {
  const desired = generateServiceMonitor({
    metadata: {
      generation: 1,
      resourceVersion: "1234",
      selfLink: "/random/string",
      uid: "randomstring"
    }
  });
  const existing = generateServiceMonitor({
    metadata: {
      generation: 2,
      resourceVersion: "5678",
      selfLink: "/even/more/random/string",
      uid: "evenmorerandomstring"
    }
  });
  expect(isServiceMonitorEqual(desired, existing)).toBe(true);
});

test("should return true when only metadata changes", () => {
  const existing = generateServiceMonitor({
    metadata: { labels: { some: "old-label" } }
  });
  const desired = generateServiceMonitor({
    metadata: { labels: { some: "new-label" } }
  });

  expect(isServiceMonitorEqual(desired, existing)).toBe(true);
});

test("should return false when selector does not match", () => {
  const existing = generateServiceMonitor();
  const desired = generateServiceMonitor();
  desired.spec.selector.newStuff = "new-stuff";

  expect(isServiceMonitorEqual(desired, existing)).toBe(false);
});

test("should return false when jobLabel does not match", () => {
  const existing = generateServiceMonitor();
  const desired = generateServiceMonitor();
  desired.spec.jobLabel = "new-job-label";

  expect(isServiceMonitorEqual(desired, existing)).toBe(false);
});

describe("should return false when endpoint does not match", () => {
  it("changing amount of endpoints", () => {
    const existing = generateServiceMonitor();
    const desired = generateServiceMonitor();
    desired.spec.endpoints = [
      generateEndpoint({ path: "one" }),
      generateEndpoint({ path: "two" }),
      generateEndpoint({ path: "three" })
    ];
    desired.spec.endpoints = [
      generateEndpoint({ path: "one" }),
      generateEndpoint({ path: "four" })
    ];

    expect(isServiceMonitorEqual(desired, existing)).toBe(false);
  });
  it("different interval", () => {
    const existing = generateServiceMonitor();
    const desired = generateServiceMonitor();
    desired.spec.endpoints = [generateEndpoint({ interval: "new" })];

    expect(isServiceMonitorEqual(desired, existing)).toBe(false);
  });
  it("different port", () => {
    const existing = generateServiceMonitor();
    const desired = generateServiceMonitor();
    desired.spec.endpoints = [generateEndpoint({ port: "new" })];

    expect(isServiceMonitorEqual(desired, existing)).toBe(false);
  });
  it("different path", () => {
    const existing = generateServiceMonitor();
    const desired = generateServiceMonitor();
    desired.spec.endpoints = [generateEndpoint({ path: "new" })];

    expect(isServiceMonitorEqual(desired, existing)).toBe(false);
  });
});
