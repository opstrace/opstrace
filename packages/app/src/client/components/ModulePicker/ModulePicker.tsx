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
      activationPrefix: "",
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
      activatePickerWithText("");
    },
    keybindings: ["mod+p"]
  });

  return null;
};

export default React.memo(ModulePicker);
