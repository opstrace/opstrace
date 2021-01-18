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

import React, { useCallback, useEffect, useRef, useState } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { ModuleEditorProps } from "../lib/types";
import { GlobalEditorCSS } from "../lib/themes";
import { getTextEditorOptions } from "state/file/utils/monaco";
import { useFocusedOpenFile } from "state/file/hooks/useFiles";
// import { opScriptDefaults } from "workers";
// import our user facing library
/* eslint-disable import/no-webpack-loader-syntax */
//@ts-ignore
// import OpstraceLib from "raw-loader!../../../../opstrace.lib";

// opScriptDefaults.addExtraLib(OpstraceLib);

const emptyMonacoFileUri = monaco.Uri.parse("file://empty.tsx");
const emptyModel = monaco.editor.createModel(
  "",
  "typescript",
  emptyMonacoFileUri
);

function ModuleEditor({ height, width, visible }: ModuleEditorProps) {
  const [ready, setReady] = useState(false);
  const editor = useRef<null | monaco.editor.ICodeEditor>(null);
  const focussedFile = useFocusedOpenFile();

  // Track our current model in a ref
  const currentModel = useRef<monaco.editor.IModel>(
    focussedFile?.model || emptyModel
  );
  const readOnly = useRef<boolean>(!focussedFile?.live || true);

  const editorContainer = useCallback(async node => {
    if (node) {
      editor.current = monaco.editor.create(
        node,
        getTextEditorOptions({
          readOnly: readOnly.current,
          model: currentModel.current
        })
      );
      setReady(true);
    }
    if (!node) {
      editor.current?.dispose();
      editor.current = null;
    }
  }, []);

  // Update editor layout when width/height changes
  useEffect(() => {
    if (width !== undefined && height !== undefined && editor.current) {
      editor.current.layout({ width, height });
    }
  }, [width, height]);

  // Update the editor model when focussedFile changes
  useEffect(() => {
    const prevFocussedFile = focussedFile;

    if (focussedFile && editor.current) {
      currentModel.current = focussedFile.model;
      editor.current.setModel(focussedFile.model);
      editor.current.updateOptions({ readOnly: !focussedFile.live });
      focussedFile.attachEditor(editor.current);
    }
    return () => {
      prevFocussedFile?.detachEditor();
    };
  }, [focussedFile]);

  // Dispose all the things when this component unmounts
  useEffect(() => {
    return () => {
      editor.current?.dispose();
      editor.current = null;
    };
  }, []);

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
