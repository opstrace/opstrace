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

import { KubeConfig } from "@kubernetes/client-node";
import {
  ResourceCollection,
  V1Alpha1CortexResource
} from "@opstrace/kubernetes";
import { ControllerOverrides } from "../helpers";

import { overrideHelper } from "./override";

// mock only the logger functions, from
// https://jestjs.io/docs/mock-functions#mocking-partials
// required so we can use deepMerge.
jest.mock("@opstrace/utils", () => {
  const originalModule = jest.requireActual("@opstrace/utils");
  return {
    ...originalModule,
    log: {
      debug: jest.fn,
      warning: jest.fn
    }
  };
});

jest.mock("@kubernetes/client-node");

test("should override the cortex-operator resource", () => {
  const state = new ResourceCollection();
  state.add(
    new V1Alpha1CortexResource(
      {
        apiVersion: "cortex.opstrace.io/v1alpha1",
        kind: "Cortex",
        metadata: {
          name: "opstrace-cortex",
          namespace: "test"
        },
        spec: {
          image: "test",
          querier_spec: {
            replicas: 2
          }
        }
      },
      new KubeConfig()
    )
  );

  const overrides: ControllerOverrides = {
    Deployment__loki__distributors: { spec: { replicas: 2 } },
    "Cortex__test__opstrace-cortex": {
      spec: { querier_spec: { replicas: 1 } }
    }
  };

  const expected = new V1Alpha1CortexResource(
    {
      apiVersion: "cortex.opstrace.io/v1alpha1",
      kind: "Cortex",
      metadata: {
        name: "opstrace-cortex",
        namespace: "test"
      },
      spec: {
        image: "test",
        querier_spec: {
          replicas: 1
        }
      }
    },
    new KubeConfig()
  ).get();

  overrideHelper(overrides, state);

  expect(state.get()).toHaveLength(1);
  const result = state.get()[0].get();
  expect(result).toMatchObject(expected);
});
