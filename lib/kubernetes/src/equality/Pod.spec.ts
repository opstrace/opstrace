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
  V1Probe,
  V1Volume,
  V1PodSpec,
  V1KeyToPath,
  V1ContainerPort,
  V1VolumeMount
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

function generateContainerPort(
  template: Partial<V1ContainerPort> = {}
): V1ContainerPort {
  return {
    name: "my-port",
    containerPort: 1001,
    hostPort: 2001,
    ...template
  };
}

function generateVolumeMount(
  template: Partial<V1VolumeMount> = {}
): V1VolumeMount {
  return {
    name: "my-volume",
    mountPath: "/mountPath",
    subPath: "/subpath",
    ...template
  };
}

function generateContainer(template: Partial<V1Container> = {}): V1Container {
  return {
    name: "busybox",
    image: "busybox:1.25",
    ports: [
      generateContainerPort({ name: "port-one" }),
      generateContainerPort({ name: "port-two" }),
      generateContainerPort({ name: "port-three" })
    ],
    volumeMounts: [
      generateVolumeMount({ name: "volume-mount-one" }),
      generateVolumeMount({ name: "volume-mount-two" }),
      generateVolumeMount({ name: "volume-mount-three" })
    ],
    env: [
      {
        name: "my-env",
        value: "my-env-value"
      }
    ],
    args: ["HOSTNAME", "KUBERNETES_PORT"],
    livenessProbe: generateProbe(),
    readinessProbe: generateProbe(),
    ...template
  };
}

function generateVolumeItem(template: Partial<V1KeyToPath> = {}): V1KeyToPath {
  return {
    key: "SPECIAL_LEVEL",
    mode: 511,
    path: "keys",
    ...template
  };
}

function generateVolumes(template: Partial<V1Volume> = {}): V1Volume {
  return {
    name: "my-volume",
    configMap: {
      defaultMode: 511,
      name: "special-config",
      optional: false,
      items: [
        generateVolumeItem({ key: "ONE" }),
        generateVolumeItem({ key: "TWO" }),
        generateVolumeItem({ key: "THREE" })
      ]
    },
    secret: {
      defaultMode: 511,
      secretName: "special-secret",
      optional: false,
      items: [
        generateVolumeItem({ key: "FOUR" }),
        generateVolumeItem({ key: "FIVE" }),
        generateVolumeItem({ key: "SEVEN" })
      ]
    },
    ...template
  };
}

function generatePodSpec(): V1PodSpec {
  return {
    serviceAccountName: "my-service-account",
    containers: [generateContainer()],
    initContainers: [generateContainer()],
    volumes: [generateVolumes()]
  };
}

// return pod for testing
function generatePodTemplateSpec(
  template: Partial<V1PodTemplateSpec> = {}
): Required<V1PodTemplateSpec> {
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
    spec: generatePodSpec(),
    ...template
  };
}

test("should return true when spec matches", () => {
  const desired = generatePodTemplateSpec();
  const existing = generatePodTemplateSpec();

  expect(isPodSpecTemplateEqual(desired, existing)).toBe(true);
});

test("should return true when spec matches and default metatada is set", () => {
  const desired = generatePodTemplateSpec({
    metadata: {
      generation: 1,
      resourceVersion: "1234",
      selfLink: "/random/string",
      uid: "randomstring"
    }
  });
  const existing = generatePodTemplateSpec({
    metadata: {
      generation: 2,
      resourceVersion: "5678",
      selfLink: "/even/more/random/string",
      uid: "evenmorerandomstring"
    }
  });
  expect(isPodSpecTemplateEqual(desired, existing)).toBe(true);
});

describe("volumes", () => {
  it("should return true when volumes have not changed", () => {
    const existing = generatePodTemplateSpec();
    const desired = generatePodTemplateSpec();

    existing.spec.volumes = [generateVolumes(), generateVolumes()];
    desired.spec.volumes = [generateVolumes(), generateVolumes()];

    expect(isPodSpecTemplateEqual(desired, existing)).toBe(true);
  });

  it("should return false when volume names changed", () => {
    const existing = generatePodTemplateSpec();
    const desired = generatePodTemplateSpec();

    existing.spec.volumes = [
      generateVolumes({ name: "old name one" }),
      generateVolumes({ name: "new name two" })
    ];
    desired.spec.volumes = [
      generateVolumes({ name: "new name one" }),
      generateVolumes({ name: "new name two" })
    ];

    expect(isPodSpecTemplateEqual(desired, existing)).toBe(false);
  });

  describe("configMap", () => {
    describe("items", () => {
      it("should return false when items have changed", () => {
        const existing = generatePodTemplateSpec();
        const desired = generatePodTemplateSpec();

        existing.spec.volumes![0].configMap!.items = [
          generateVolumeItem({ key: "ONE OLD" }),
          generateVolumeItem({ key: "TWO OLD" }),
          generateVolumeItem({ key: "THREE OLD" })
        ];

        desired.spec.volumes![0].configMap!.items = [
          generateVolumeItem({ key: "ONE NEW" }),
          generateVolumeItem({ key: "TWO NEW" })
        ];

        expect(isPodSpecTemplateEqual(desired, existing)).toBe(false);
      });
    });
  });

  describe("secrets", () => {
    describe("items", () => {
      it("should return false when items have changed", () => {
        const existing = generatePodTemplateSpec();
        const desired = generatePodTemplateSpec();

        existing.spec.volumes![0].secret!.items = [
          generateVolumeItem({ key: "ONE OLD" }),
          generateVolumeItem({ key: "TWO OLD" }),
          generateVolumeItem({ key: "THREE OLD" })
        ];

        desired.spec.volumes![0].secret!.items = [
          generateVolumeItem({ key: "ONE NEW" }),
          generateVolumeItem({ key: "TWO NEW" })
        ];

        expect(isPodSpecTemplateEqual(desired, existing)).toBe(false);
      });
    });
  });
});

describe("initContainers", () => {
  it("should return true when initContainers have not changed", () => {
    const existing = generatePodTemplateSpec();
    const desired = generatePodTemplateSpec();

    existing.spec.initContainers = [generateContainer(), generateContainer()];
    desired.spec.initContainers = [generateContainer(), generateContainer()];

    expect(isPodSpecTemplateEqual(desired, existing)).toBe(true);
  });

  it("should return false when initContainers amount has changed", () => {
    const existing = generatePodTemplateSpec();
    const desired = generatePodTemplateSpec();

    existing.spec.initContainers = [generateContainer(), generateContainer()];
    desired.spec.initContainers = [generateContainer()];

    expect(isPodSpecTemplateEqual(desired, existing)).toBe(false);
  });
});

describe("containers", () => {
  it("should return true when containers have not changed", () => {
    const existing = generatePodTemplateSpec();
    const desired = generatePodTemplateSpec();

    existing.spec.containers = [generateContainer(), generateContainer()];
    desired.spec.containers = [generateContainer(), generateContainer()];

    expect(isPodSpecTemplateEqual(desired, existing)).toBe(true);
  });

  it("should return false when container amount has changed", () => {
    const existing = generatePodTemplateSpec();
    const desired = generatePodTemplateSpec();

    existing.spec.containers = [generateContainer(), generateContainer()];
    desired.spec.containers = [generateContainer()];

    expect(isPodSpecTemplateEqual(desired, existing)).toBe(false);
  });

  describe("ports", () => {
    it("should return false when quantity changes", () => {
      const existing = generatePodTemplateSpec();
      const desired = generatePodTemplateSpec();

      existing.spec.containers[0].ports = [
        generateContainerPort(),
        generateContainerPort()
      ];
      desired.spec.containers[0].ports = [generateContainerPort()];

      expect(isPodSpecTemplateEqual(desired, existing)).toBe(false);
    });
    it("should return false when name doesnt match", () => {
      const existing = generatePodTemplateSpec();
      const desired = generatePodTemplateSpec();

      existing.spec.containers[0].ports = [
        generateContainerPort({ name: "old" })
      ];
      desired.spec.containers[0].ports = [
        generateContainerPort({ name: "new" })
      ];

      expect(isPodSpecTemplateEqual(desired, existing)).toBe(false);
    });

    it("should return false when containerPort doesnt match", () => {
      const existing = generatePodTemplateSpec();
      const desired = generatePodTemplateSpec();

      existing.spec.containers[0].ports = [
        generateContainerPort({ containerPort: 1 })
      ];
      desired.spec.containers[0].ports = [
        generateContainerPort({ containerPort: 2 })
      ];

      expect(isPodSpecTemplateEqual(desired, existing)).toBe(false);
    });

    it("should return false when hostPort doesnt match", () => {
      const existing = generatePodTemplateSpec();
      const desired = generatePodTemplateSpec();

      existing.spec.containers[0].ports = [
        generateContainerPort({ hostPort: 1 })
      ];
      desired.spec.containers[0].ports = [
        generateContainerPort({ hostPort: 2 })
      ];

      expect(isPodSpecTemplateEqual(desired, existing)).toBe(false);
    });
  });

  describe("volume mounts", () => {
    it("should return false when quantity changes", () => {
      const existing = generatePodTemplateSpec();
      const desired = generatePodTemplateSpec();

      existing.spec.containers[0].volumeMounts = [
        generateVolumeMount(),
        generateVolumeMount()
      ];
      desired.spec.containers[0].volumeMounts = [generateVolumeMount()];

      expect(isPodSpecTemplateEqual(desired, existing)).toBe(false);
    });
    it("should return false when name doesnt match", () => {
      const existing = generatePodTemplateSpec();
      const desired = generatePodTemplateSpec();

      existing.spec.containers[0].volumeMounts = [
        generateVolumeMount({ name: "old" })
      ];
      desired.spec.containers[0].volumeMounts = [
        generateVolumeMount({ name: "new" })
      ];

      expect(isPodSpecTemplateEqual(desired, existing)).toBe(false);
    });

    it("should return false when mountPath doesnt match", () => {
      const existing = generatePodTemplateSpec();
      const desired = generatePodTemplateSpec();

      existing.spec.containers[0].volumeMounts = [
        generateVolumeMount({ mountPath: "mount-path-old" })
      ];
      desired.spec.containers[0].volumeMounts = [
        generateVolumeMount({ mountPath: "mount-path-new" })
      ];

      expect(isPodSpecTemplateEqual(desired, existing)).toBe(false);
    });

    it("should return false when subPath doesnt match", () => {
      const existing = generatePodTemplateSpec();
      const desired = generatePodTemplateSpec();

      existing.spec.containers[0].volumeMounts = [
        generateVolumeMount({ subPath: "sub-path-old" })
      ];
      desired.spec.containers[0].volumeMounts = [
        generateVolumeMount({ subPath: "sub-path-new" })
      ];

      expect(isPodSpecTemplateEqual(desired, existing)).toBe(false);
    });
  });

  describe("liveness probe", () => {
    it("should return false when exec doesnt match", () => {
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

    it("should return false when httpGet doesnt match", () => {
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

    it("should return false when tcpSocket doesnt match", () => {
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
});
