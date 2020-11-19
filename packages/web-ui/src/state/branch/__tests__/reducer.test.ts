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
import { reducer as BranchReducer } from "../reducer";
import * as actions from "../actions";

const mockState = {
  currentBranchName: "main",
  branches: [],
  loading: true
};

test("return mock state", () => {
  const reducer = BranchReducer(mockState, {} as any);

  expect(reducer).toEqual(mockState);
});

test("handle set action", () => {
  const branches = [
    { name: "test-1", created_at: "2020-11-01", protected: false },
    { name: "test-2", created_at: "2020-11-03", protected: true }
  ];

  const reducer = BranchReducer(mockState, actions.set(branches));

  expect(reducer.branches).toEqual(branches);
  expect(reducer.loading).toBeFalsy();
});

test("handle setCurrentBranch action", () => {
  const reducer = BranchReducer(
    mockState,
    actions.setCurrentBranch("new-main")
  );

  expect(reducer.currentBranchName).toEqual("new-main");
});
