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

import {
  V1PodTemplateSpec,
  V1Container,
  V1Probe
} from "@kubernetes/client-node";
import { isPodSpecTemplateEqual } from "./Pod";

// mock logger
jest.mock("@opstrace/utils", () => ({
  log: {
    debug: jest.fn
  }
}));

function generateProbe(template: Partial<V1Probe> = {}): Required<V1Probe> {
  return {
    exec: {
      command: ["cat", "/tmp/healthy"]
    },
    failureThreshold: 1,
    initialDelaySeconds: 5,
    periodSeconds: 5,
    httpGet: {
      // @ts-ignore should be number, not object as TS insists
      port: 3000
    },
    successThreshold: 1,
    timeoutSeconds: 1,
    tcpSocket: {
      // @ts-ignore should be number, not object as TS insists
      port: 8080
    },
    ...template
  };
}

function generateContainer(): V1Container {
  return {
    name: "busybox",
    image: "busybox:1.25",
    ports: [
      {
        name: "my-port",
        containerPort: 8080,
        hostPort: 3000
      }
    ],
    volumeMounts: [
      {
        name: "my-volume",
        mountPath: "/mountPath",
        subPath: "/subpath"
      }
    ],
    env: [
      {
        name: "my-env",
        value: "my-env-value"
      }
    ],
    args: ["HOSTNAME", "KUBERNETES_PORT"],
    livenessProbe: generateProbe(),
    readinessProbe: generateProbe()
  };
}

// return pod for testing
function generatePodTemplateSpec(): Required<V1PodTemplateSpec> {
  return {
    metadata: {
      name: "example"
    },
    spec: {
      serviceAccountName: "my-service-account",
      containers: [generateContainer()],
      initContainers: [generateContainer()],
      volumes: [
        {
          name: "my-volume",
          configMap: {
            defaultMode: 511,
            name: "special-config",
            optional: false,
            items: [
              {
                key: "SPECIAL_LEVEL",
                mode: 511,
                path: "keys"
              }
            ]
          },
          secret: {
            defaultMode: 511,
            secretName: "special-secret",
            optional: false,
            items: [
              {
                key: "SPECIAL_SECRET_LEVEL",
                mode: 511,
                path: "keys"
              }
            ]
          }
        }
      ]
    }
  };
}

test("should return true when spec matches", () => {
  const desired = generatePodTemplateSpec();
  const existing = generatePodTemplateSpec();

  expect(isPodSpecTemplateEqual(desired, existing)).toBe(true);
});

describe("should return false when container liveness probe doesnt match", () => {
  it("different exec", () => {
    const existingProbe = generateProbe();
    const desiredProbe = generateProbe({
      exec: {
        command: ["different", "command"]
      }
    });

    const existing = generatePodTemplateSpec();
    const desired = generatePodTemplateSpec();

    existing.spec.containers[0].livenessProbe = existingProbe;
    desired.spec.containers[0].livenessProbe = desiredProbe;

    expect(isPodSpecTemplateEqual(desired, existing)).toBe(false);
  });

  it("different httpGet", () => {
    const existingProbe = generateProbe();
    const desiredProbe = generateProbe({
      httpGet: {
        // @ts-ignore should be number, not object as TS insists
        port: 3001
      }
    });

    const existing = generatePodTemplateSpec();
    const desired = generatePodTemplateSpec();

    existing.spec.containers[0].livenessProbe = existingProbe;
    desired.spec.containers[0].livenessProbe = desiredProbe;

    expect(isPodSpecTemplateEqual(desired, existing)).toBe(false);
  });

  it("different tcpSocket", () => {
    const existingProbe = generateProbe();
    const desiredProbe = generateProbe({
      tcpSocket: {
        // @ts-ignore should be number, not object as TS insists
        port: 3001
      }
    });

    const existing = generatePodTemplateSpec();
    const desired = generatePodTemplateSpec();

    existing.spec.containers[0].livenessProbe = existingProbe;
    desired.spec.containers[0].livenessProbe = desiredProbe;

    expect(isPodSpecTemplateEqual(desired, existing)).toBe(false);
  });
});
