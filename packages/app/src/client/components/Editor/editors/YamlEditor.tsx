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
import {editor} from "monaco-editor/esm/vs/editor/editor.api";

import AutoSizer, { Size } from "react-virtualized-auto-sizer";
import { YamlEditorProps } from "../lib/types";
import { GlobalEditorCSS } from "../lib/themes";
import { getTextEditorOptions } from "state/file/utils/monaco";

function AutoSizingYamlEditor({ model }: { model: editor.ITextModel }) {
  return (
    <AutoSizer>
      {({ height, width }: Size) => {
        return <YamlEditor height={height} width={width} model={model} />;
      }}
    </AutoSizer>
  );
}

function YamlEditor({ height, width, model }: YamlEditorProps & Size) {
  const editorRef = useRef<null | editor.ICodeEditor>(null);
  const currentModelRef = useRef<editor.IModel>(model);

  const editorContainer = useCallback(async node => {
    if (node) {
      editorRef.current = editor.create(
        node,
        getTextEditorOptions({
          readOnly: false,
          model: currentModelRef.current
        })
      );
    }
    else {
      editorRef.current?.dispose();
      editorRef.current = null;
    }
  }, []);

  // Update editor layout when width/height changes
  useEffect(() => {
    if (width !== undefined && height !== undefined && editorRef.current) {
      editorRef.current.layout({ width, height });
    }
  }, [width, height]);

  // Dispose all the things when this component unmounts
  useEffect(() => {
    return () => {
      editorRef.current?.dispose();
      editorRef.current = null;
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
