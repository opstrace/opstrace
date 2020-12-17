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

import React from "react";

import { PickerOption, usePickerService } from "client/services/Picker";
import { useCommandService } from "client/services/Command";
import { useHistory } from "react-router-dom";
import useBranches from "state/branch/hooks/useBranches";
import { setCurrentBranch } from "state/branch/actions";
import { Branch } from "state/branch/types";
import { useDispatch } from "react-redux";

function branchToPickerOption(branch: Branch): PickerOption {
  return {
    text: branch.name,
    id: branch.name
  };
}

const BranchPicker = () => {
  const history = useHistory();
  const branches = useBranches();
  const dispatch = useDispatch();

  const { activatePickerWithText } = usePickerService(
    {
      activationPrefix: "branch:",
      options: branches ? branches.map(branchToPickerOption) : [],
      onSelected: option => {
        dispatch(setCurrentBranch({ name: option.id, history }));
      }
    },
    [branches, history]
  );

  useCommandService({
    id: "select-branch-picker",
    description: "Select Branch",
    handler: e => {
      e.keyboardEvent?.preventDefault();
      activatePickerWithText("branch: ");
    }
  });

  return null;
};

export default React.memo(BranchPicker);
