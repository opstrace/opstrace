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

import { createReducer, ActionType } from "typesafe-actions";
import { Branches } from "./types";
import * as actions from "./actions";

type BranchesActions = ActionType<typeof actions>;

type BranchesState = {
  currentBranchName: string;
  branches: Branches;
  loading: boolean;
};

const BranchesInitialState: BranchesState = {
  currentBranchName: "main",
  branches: [],
  loading: true
};

export const reducer = createReducer<BranchesState, BranchesActions>(
  BranchesInitialState
)
  .handleAction(
    actions.set,
    (state, action): BranchesState => ({
      ...state,
      branches: action.payload,
      loading: false
    })
  )
  .handleAction(
    actions.setCurrentBranch,
    (state, action): BranchesState => ({
      ...state,
      currentBranchName: action.payload.name
    })
  );
