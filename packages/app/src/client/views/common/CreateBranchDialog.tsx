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

import { usePickerService } from "client/services/Picker";
import { useCommandService } from "client/services/Command";
import { createBranch } from "state/branch/actions";
import { useDispatch } from "react-redux";
import { useHistory } from "react-router-dom";

const CreateBranchPicker = () => {
  const dispatch = useDispatch();
  const history = useHistory();

  const { activatePickerWithText } = usePickerService(
    {
      title: "Enter branch name",
      activationPrefix: "create branch:",
      disableFilter: true,
      textValidator: /^[a-z0-9_-]+$/i,
      options: [
        {
          id: "yes",
          text: `create`
        },
        {
          id: "no",
          text: "cancel"
        }
      ],
      onSelected: (option, branch) => {
        if (option.id === "yes" && branch) {
          dispatch(createBranch({ name: branch, history }));
        }
      }
    },
    [history]
  );

  useCommandService({
    id: "create-branch-picker",
    description: "Create Branch",
    handler: e => {
      e.keyboardEvent?.preventDefault();
      activatePickerWithText("create branch: ");
    }
  });

  return null;
};

export default React.memo(CreateBranchPicker);
