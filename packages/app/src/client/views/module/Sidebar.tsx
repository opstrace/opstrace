import React, { useCallback } from "react";
import IconButton from "@material-ui/core/IconButton";
import AddIcon from "@material-ui/icons/Add";

import { SideBar, SideBarContainer } from "client/components/SideBar";
import { useCommandService } from "client/services/Command";
import { ModuleTreeViewContainer } from "client/components/TreeView";

import BranchSelector from "client/views/common/BranchSelector";

const ModuleSidebar = () => {
  const createNewBranch = useCallback(() => {
    console.log("calling createBranch");
  }, []);

  const createNewModule = useCallback(() => {
    console.log("calling createModule");
  }, []);

  useCommandService(
    {
      id: "create-module",
      description: "Create Module",
      category: "Module",
      handler: e => {
        e.keyboardEvent?.preventDefault();
        createNewModule();
      }
    },
    [createNewModule]
  );

  const branchActions = (
    <IconButton size="small" onClick={createNewBranch}>
      <AddIcon />
    </IconButton>
  );

  const moduleActions = (
    <IconButton size="small" onClick={createNewModule}>
      <AddIcon />
    </IconButton>
  );

  return (
    <SideBar>
      <SideBarContainer title="Branches" actions={branchActions}>
        <BranchSelector />
      </SideBarContainer>
      <SideBarContainer title="Modules" actions={moduleActions}>
        <ModuleTreeViewContainer />
      </SideBarContainer>
    </SideBar>
  );
};

export default ModuleSidebar;
