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

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useHistory, useParams } from "react-router-dom";

import { Box } from "client/components/Box";
import { useCurrentBranch } from "state/branch/hooks/useBranches";
import { ModulePicker } from "client/components/ModulePicker";
import { requestOpenFileWithParams } from "state/file/actions";
import { setCurrentBranch } from "state/branch/actions";
import { sanitizeFilePath, sanitizeScope } from "state/utils/sanitize";
import { useCommandService } from "client/services/Command";
import { isEditMode, setEditingMode } from "state/file/utils/navigation";
import { SplitPane } from "client/components/SplitPane";
import { ModuleEditorGroup } from "client/components/Editor";
import Layout from "client/layout/MainContent";

import Sandbox from "./Sandbox";

const ModuleLayout = ({ sidebar }: { sidebar: React.ReactNode }) => {
  const { branch, scope = "", name, version, path } = useParams<{
    branch: string;
    scope?: string;
    name: string;
    version: string;
    path: string;
  }>();
  const sanitizedPath = sanitizeFilePath(path);
  const sanitizedScope = sanitizeScope(scope);

  const currentBranch = useCurrentBranch();

  const dispatch = useDispatch();
  const history = useHistory();
  const editing = isEditMode(history);
  // when we first land here we need to check the route params
  // and ensure we request to open the file represented by
  // the route we're on
  useEffect(() => {
    dispatch(setCurrentBranch({ name: branch, history }));
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
  }, [history, dispatch, branch, name, version, sanitizedScope, sanitizedPath]);

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

  // We have to keep track of any drag events on the SplitPane and show an overlay
  // so the drag event doesn't get lost when hovering over a child iframe
  const [dragging, setDragging] = useState(false);
  const onDrag = useCallback((dragging: boolean) => {
    if (dragging) {
      setDragging(true);
    } else {
      setDragging(false);
    }
  }, []);

  const ModuleContent = useMemo(() => {
    if (currentBranch === null) {
      return "branch doesn't exist";
    }

    return (
      <SplitPane
        onDrag={onDrag}
        split="vertical"
        size={editing ? 700 : 0}
        minSize={100}
      >
        {/* Editor if in editor mode */}
        <Box position="absolute" left={0} right={0} top={0} bottom={0}>
          <ModuleEditorGroup />
        </Box>
        <Sandbox />
      </SplitPane>
    );
  }, [editing, currentBranch, onDrag]);

  return (
    <>
      <ModulePicker />
      <Layout onDrag={onDrag} sidebar={sidebar}>
        {ModuleContent}
      </Layout>
      <Box
        position="absolute"
        top={0}
        bottom={0}
        left={0}
        right={0}
        display={dragging ? "box" : "none"}
      ></Box>
    </>
  );
};

export default React.memo(ModuleLayout);
