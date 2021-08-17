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

import { StatefulSet, StatefulSetType } from "../kinds";
import { KubeConfig, V1StatefulSet } from "@kubernetes/client-node";
import { getStatefulSetRolloutMessage } from "./statefulset";

// mock logger
jest.mock("@opstrace/utils", () => ({
  log: {
    debug: jest.fn
  }
}));
// mock KubeConfig
jest.mock("@kubernetes/client-node");

// return an empty certificate for testing
function generateStatefulset(
  template: Partial<V1StatefulSet> = {}
): StatefulSetType {
  return new StatefulSet(
    {
      metadata: {
        annotations: {
          test: "test"
        },
        name: "test",
        namespace: "testnamespace"
      },
      spec: {
        selector: {
          matchLabels: {}
        },
        serviceName: "test",
        template: {},
        updateStrategy: {
          type: "RollingUpdate"
        }
      },
      status: {
        replicas: 0
      },
      ...template
    },
    new KubeConfig()
  );
}

test("should return empty string when update strategy is not RollingUpdate", () => {
  const sts = generateStatefulset({
    spec: {
      selector: {
        matchLabels: {}
      },
      serviceName: "test",
      template: {},
      updateStrategy: {
        type: "OnDelete"
      }
    }
  });
  const expected = "";

  expect(getStatefulSetRolloutMessage(sts)).toBe(expected);
});

test("should handle spec update to be observed", () => {
  const sts = generateStatefulset({
    status: {
      replicas: 3,
      observedGeneration: 0
    }
  });
  const expected = `Waiting for StatefulSet spec update to be observed for testnamespace/test`;

  expect(getStatefulSetRolloutMessage(sts)).toBe(expected);
});

test("should handle pods to be ready", () => {
  const sts = generateStatefulset({
    spec: {
      selector: {
        matchLabels: {}
      },
      serviceName: "test",
      template: {},
      replicas: 3
    },
    status: {
      replicas: 3,
      observedGeneration: 1,
      readyReplicas: 1
    }
  });
  const expected = `Waiting for 2 pods to be ready for StatefulSet testnamespace/test`;

  // expect(sts.spec).toBeNull();
  expect(getStatefulSetRolloutMessage(sts)).toBe(expected);
});

test("should handle partitioned roll out to finish", () => {
  const sts = generateStatefulset({
    spec: {
      selector: {
        matchLabels: {}
      },
      serviceName: "test",
      template: {},
      replicas: 5,
      updateStrategy: {
        type: "RollingUpdate",
        rollingUpdate: {
          partition: 1
        }
      }
    },
    status: {
      replicas: 5,
      observedGeneration: 1,
      readyReplicas: 5,
      updatedReplicas: 2
    }
  });
  const expected = `Waiting for partitioned roll out to finish for StatefulSet: 2 out of 4 new pods have been updated for testnamespace/test`;

  expect(getStatefulSetRolloutMessage(sts)).toBe(expected);
});

test("should handle completed partitioned roll out", () => {
  const sts = generateStatefulset({
    spec: {
      selector: {
        matchLabels: {}
      },
      serviceName: "test",
      template: {},
      replicas: 5,
      updateStrategy: {
        type: "RollingUpdate",
        rollingUpdate: {
          partition: 1
        }
      }
    },
    status: {
      replicas: 5,
      observedGeneration: 1,
      readyReplicas: 5,
      updatedReplicas: 5
    }
  });
  const expected = "";

  expect(getStatefulSetRolloutMessage(sts)).toBe(expected);
});

test("should handle rolling update to complete", () => {
  const sts = generateStatefulset({
    spec: {
      selector: {
        matchLabels: {}
      },
      serviceName: "test",
      template: {},
      replicas: 5,
      updateStrategy: {
        type: "RollingUpdate"
      }
    },
    status: {
      replicas: 5,
      observedGeneration: 1,
      readyReplicas: 5,
      updatedReplicas: 2,
      updateRevision: "2",
      currentRevision: "1"
    }
  });
  const expected = `waiting for StatefulSet rolling update to complete 2 pods at revision 2 for testnamespace/test`;

  expect(getStatefulSetRolloutMessage(sts)).toBe(expected);
});

test("should handle completed rolling update", () => {
  const sts = generateStatefulset({
    spec: {
      selector: {
        matchLabels: {}
      },
      serviceName: "test",
      template: {},
      replicas: 5,
      updateStrategy: {
        type: "RollingUpdate"
      }
    },
    status: {
      replicas: 5,
      observedGeneration: 1,
      readyReplicas: 5,
      updatedReplicas: 2,
      updateRevision: "2",
      currentRevision: "2"
    }
  });
  const expected = "";

  expect(getStatefulSetRolloutMessage(sts)).toBe(expected);
});
