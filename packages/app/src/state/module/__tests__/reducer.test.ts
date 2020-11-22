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
import { reducer as ModuleReducer } from "../reducer";
import * as actions from "../actions";

const mockState = {
  modules: [
    {
      name: "test-module",
      created_at: "2020-11-11",
      branch_name: "test-branch",
      scope: ""
    }
  ],
  loading: true
};

test("return mock state", () => {
  const reducer = ModuleReducer(mockState, {} as any);

  expect(reducer).toEqual(mockState);
});

test("handle set action", () => {
  const modules = [
    {
      name: "new-test-module",
      created_at: "2020-11-12",
      branch_name: "new-branch-1",
      scope: ""
    }
  ];

  const reducer = ModuleReducer(mockState, actions.set(modules));

  expect(reducer.modules).toEqual(modules);
  expect(reducer.loading).toBeFalsy();
});
