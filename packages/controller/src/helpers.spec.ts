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

import { KubeConfig, V1ConfigMap } from "@kubernetes/client-node";
import { ConfigMap } from "@opstrace/kubernetes";
import { ControllerOverrides, getControllerOverrides } from "./helpers";

// mock logger
jest.mock("@opstrace/utils", () => ({
  log: {
    debug: jest.fn,
    warning: jest.fn
  }
}));

jest.mock("@kubernetes/client-node");

test("should parse a simple config map with controller overrides", () => {
  const resource: V1ConfigMap = {
    data: {
      Deployment__loki__distributors: `
spec:
 replicas: 2
`
    }
  };
  const kubeconfig = new KubeConfig();
  const cm = new ConfigMap(resource, kubeconfig);

  const expected: ControllerOverrides = {
    Deployment__loki__distributors: { spec: { replicas: 2 } }
  };

  const result = getControllerOverrides(cm);

  expect(result).toMatchObject(expected);
});

test("should parse a more complex config map with controller overrides", () => {
  const resource: V1ConfigMap = {
    data: {
      Deployment__loki__distributors: `
spec:
  replicas: 2
`,
      "Cortex__cortex__opstrace-cortex": `
spec:
  querier_spec:
    replicas: 1
`
    }
  };
  const kubeconfig = new KubeConfig();
  const cm = new ConfigMap(resource, kubeconfig);

  const expected: ControllerOverrides = {
    Deployment__loki__distributors: { spec: { replicas: 2 } },
    "Cortex__cortex__opstrace-cortex": {
      spec: { querier_spec: { replicas: 1 } }
    }
  };

  const result = getControllerOverrides(cm);

  expect(result).toMatchObject(expected);
});
