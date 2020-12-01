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

import React, { useEffect, useRef } from "react";
import { useDispatch, batch } from "react-redux";
import { useHistory, useParams } from "react-router-dom";

import { Box } from "client/components/Box";
import { useOpenFileRequestParams } from "state/file/hooks/useFiles";
import {
  useCurrentBranchName,
  useCurrentBranch
} from "state/branch/hooks/useBranches";
import { ModulePicker } from "client/components/ModulePicker";
import { requestOpenFileWithParams } from "state/file/actions";
import { setCurrentBranch } from "state/branch/actions";
import { sanitizeFilePath, sanitizeScope } from "state/utils/sanitize";
import { useCommandService } from "client/services/Command";
import { setEditingMode } from "state/file/utils/navigation";
import { SplitPane } from "client/components/SplitPane";
import { ModuleEditor } from "client/components/Editor";
import { useFocusedOpenFile } from "state/file/hooks/useFiles";
import Layout from "client/layout";

import ModuleOutput from "./ModuleOutput";

const ModuleLayout = ({ sidebar }: { sidebar: React.ReactNode }) => {
  const { mode, branch, scope = "", name, version, path } = useParams<{
    mode: string;
    branch: string;
    scope?: string;
    name: string;
    version: string;
    path: string;
  }>();
  const sanitizedPath = sanitizeFilePath(path);
  const sanitizedScope = sanitizeScope(scope);

  const currentBranchName = useCurrentBranchName();
  const currentBranch = useCurrentBranch();

  const {
    requestedModuleName,
    requestedModuleScope,
    requestedModuleVersion,
    requestedFilePath
  } = useOpenFileRequestParams();
  const dispatch = useDispatch();
  const history = useHistory();
  const processedInitialLoad = useRef(false);
  const editing = mode === "e";

  // when we first land here we need to check the route params
  // and ensure we request to open the file represented by
  // the route we're on
  useEffect(() => {
    if (processedInitialLoad.current) {
      return;
    }
    processedInitialLoad.current = true;

    batch(() => {
      if (branch !== currentBranchName) {
        dispatch(setCurrentBranch({ name: branch, history }));
      }
      if (
        sanitizedScope !== requestedModuleScope ||
        name !== requestedModuleName ||
        version !== requestedModuleVersion ||
        sanitizedPath !== requestedFilePath
      ) {
        dispatch(
          requestOpenFileWithParams({
            history,
            params: {
              selectedModuleName: name,
              selectedModuleVersion: version,
              selectedFilePath: sanitizedPath,
              selectedModuleScope: sanitizedScope
            }
          })
        );
      }
    });
  }, [
    history,
    dispatch,
    branch,
    name,
    version,
    sanitizedScope,
    sanitizedPath,
    currentBranchName,
    requestedModuleName,
    requestedModuleScope,
    requestedModuleVersion,
    requestedFilePath
  ]);

  useCommandService(
    {
      id: "toggle-edit-mode",
      description: editing ? "Hide Editor" : "Show Editor",
      category: "Module",
      keybindings: ["mod+e"],
      handler: e => {
        e.keyboardEvent?.preventDefault();
        setEditingMode(history, !editing);
      }
    },
    [editing, history]
  );

  const file = useFocusedOpenFile();

  const getModuleContent = () => {
    if (currentBranch === null) {
      return "branch doesn't exist";
    }

    if (editing) {
      return (
        <SplitPane split="vertical" size={700} minSize={100}>
          {/* Editor if in editor mode */}
          <Box position="absolute" left={0} right={0} top={0} bottom={0}>
            <ModuleEditor textFileModel={file} />
          </Box>
          <ModuleOutput textFileModel={file} />
        </SplitPane>
      );
    }

    return <ModuleOutput textFileModel={file} />;
  };

  return (
    <>
      <ModulePicker />
      <Layout sidebar={sidebar}>{getModuleContent()}</Layout>
    </>
  );
};

export default ModuleLayout;
