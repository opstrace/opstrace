/**
 * Copyright 2019-2021 Opstrace, Inc.
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
import { reducer as ModuleVersionReducer } from "../reducer";
import * as actions from "../actions";

const mockState = {
  versions: [
    {
      module_version: "0.1",
      version: "1",
      branch_name: "test",
      created_at: "2020-11-11",
      module_name: "test-module",
      module_scope: ""
    }
  ],
  loading: true
};

test("return mock state", () => {
  const reducer = ModuleVersionReducer(mockState, {} as any);

  expect(reducer).toEqual(mockState);
});

test("handle set action", () => {
  const modulesVersion = [
    {
      module_version: "0.2",
      version: "2",
      branch_name: "branch-2",
      created_at: "2020-11-11",
      module_name: "module-2",
      module_scope: ""
    },
    {
      module_version: "0.3",
      version: "3",
      branch_name: "branch-3",
      created_at: "2020-11-11",
      module_name: "module-3",
      module_scope: ""
    }
  ];

  const reducer = ModuleVersionReducer(mockState, actions.set(modulesVersion));

  expect(reducer.versions).toEqual(modulesVersion);
  expect(reducer.loading).toBeFalsy();
});
