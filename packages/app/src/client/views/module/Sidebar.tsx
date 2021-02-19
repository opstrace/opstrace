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

import React, { useCallback } from "react";
import IconButton from "@material-ui/core/IconButton";
import AddIcon from "@material-ui/icons/Add";

import { SideBar, SideBarContainer } from "client/components/SideBar";
import { ModuleTreeViewContainer } from "client/components/TreeView";

import BranchSelector from "client/views/common/BranchSelector";
import { usePickerService } from "client/services/Picker";
import CreateModuleDialog from "client/views/common/CreateModuleDialog";

function ModuleSidebar() {
  const { activatePickerWithText } = usePickerService();

  const createBranch = useCallback(() => {
    activatePickerWithText("create branch: ");
  }, [activatePickerWithText]);

  const createModule = useCallback(() => {
    activatePickerWithText("create module: ");
  }, [activatePickerWithText]);

  const branchActions = (
    <IconButton size="small" onClick={createBranch}>
      <AddIcon />
    </IconButton>
  );

  const moduleActions = (
    <IconButton size="small" onClick={createModule}>
      <AddIcon />
    </IconButton>
  );

  return (
    <SideBar>
      <CreateModuleDialog />
      <SideBarContainer title="Branches" actions={branchActions} minHeight={50}>
        <BranchSelector />
      </SideBarContainer>
      <SideBarContainer title="Modules" actions={moduleActions} flexGrow={1}>
        <ModuleTreeViewContainer />
      </SideBarContainer>
    </SideBar>
  );
}

export default ModuleSidebar;
