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

import React, { useCallback, useEffect, useState } from "react";
import getWorkerApi from "client/components/Editor/lib/workers";
import { ModuleEditorProps } from "../lib/types";
import { GlobalEditorCSS } from "../lib/themes";
import getStore from "state/store";
import { getCurrentBranchName } from "state/branch/hooks/useBranches";
import { getCurrentBranchFiles } from "state/file/hooks/useFiles";

function ModuleEditor({
  textFileModel,
  height,
  width,
  visible
}: ModuleEditorProps) {
  const [ready, setReady] = useState(false);
  const editorContainer = useCallback(
    async node => {
      if (node && textFileModel) {
        await textFileModel.render(node);
        setReady(true);
        const api = await getWorkerApi();
        const state = getStore().getState();
        const branch = getCurrentBranchName(state);
        const files = getCurrentBranchFiles(state);
        await api.setBranchFiles(branch, files || []);
        textFileModel.onFileSystemReady();
      }
    },
    [textFileModel]
  );

  useEffect(() => {
    if (width !== undefined && height !== undefined && textFileModel) {
      textFileModel.updateEditorLayout({ width, height });
    }
  }, [width, height, textFileModel]);

  return (
    <>
      <GlobalEditorCSS />
      <div
        ref={editorContainer}
        style={{
          height,
          width,
          opacity: ready ? 1 : 0,
          display: visible ? "block" : "none"
        }}
      />
    </>
  );
}

export default React.memo(ModuleEditor);
