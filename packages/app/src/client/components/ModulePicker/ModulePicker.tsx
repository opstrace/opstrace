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
import { useLatestBranchTypescriptFiles } from "state/file/hooks/useFiles";
import { requestOpenFileWithParams } from "state/file/actions";
import { getFileUri } from "state/file/utils/uri";
import { File } from "state/file/types";
import { useCurrentBranch } from "state/branch/hooks/useBranches";
import { useDispatch } from "react-redux";
import { useHistory } from "react-router-dom";

function fileToPickerOption(file: File): PickerOption {
  return {
    text: getFileUri(file),
    id: file.id
  };
}

const ModulePicker = () => {
  const history = useHistory();
  const dispatch = useDispatch();
  const files = useLatestBranchTypescriptFiles();
  const currentBranch = useCurrentBranch();

  const { activatePickerWithText } = usePickerService(
    {
      activationPrefix: ">",
      options: files ? files.files.map(fileToPickerOption) : [],
      onSelected: option => {
        if (!files) {
          return;
        }
        const file = files.files.find(f => f.id === option.id);
        if (!file || !currentBranch) {
          return;
        }

        dispatch(
          requestOpenFileWithParams({
            history,
            params: {
              selectedFilePath: file.path,
              selectedModuleName: file.module_name,
              selectedModuleScope: file.module_scope,
              selectedModuleVersion: file.module_version
            }
          })
        );
      }
    },
    [files?.files.length, files?.tsFileCount, dispatch]
  );

  useCommandService({
    id: "open-module-picker",
    description: "Select File",
    handler: e => {
      e.keyboardEvent?.preventDefault();
      activatePickerWithText("> ");
    },
    keybindings: ["mod+shift+p"]
  });

  return null;
};

export default React.memo(ModulePicker);
