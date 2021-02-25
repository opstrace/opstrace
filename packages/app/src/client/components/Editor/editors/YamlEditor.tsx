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

import React, { useCallback, useEffect, useRef } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

import AutoSizer, { Size } from "react-virtualized-auto-sizer";
import { YamlEditorProps } from "../lib/types";
import { GlobalEditorCSS } from "../lib/themes";
import { getTextEditorOptions } from "state/file/utils/monaco";

function AutoSizingYamlEditor({ model }: { model: monaco.editor.ITextModel }) {
  return (
    <AutoSizer>
      {({ height, width }: Size) => {
        return <YamlEditor height={height} width={width} model={model} />;
      }}
    </AutoSizer>
  );
}

function YamlEditor({ height, width, model }: YamlEditorProps & Size) {
  const editor = useRef<null | monaco.editor.ICodeEditor>(null);

  const currentModel = useRef<monaco.editor.IModel>(model);

  const editorContainer = useCallback(async node => {
    if (node) {
      editor.current = monaco.editor.create(
        node,
        getTextEditorOptions({
          readOnly: false,
          model: currentModel.current
        })
      );
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
          width
        }}
      />
    </>
  );
}

export default React.memo(AutoSizingYamlEditor);
