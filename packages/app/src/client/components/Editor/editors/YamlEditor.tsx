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
import { yaml } from "workers";

import AutoSizer, { Size } from "react-virtualized-auto-sizer";
import { YamlEditorProps } from "../lib/types";
import { GlobalEditorCSS } from "../lib/themes";
import { getTextEditorOptions } from "state/file/utils/monaco";

const YamlEditor = ({ filename, jsonSchema, data, onChange }: YamlEditorProps) => {
  const modelRef = useRef<monaco.editor.IModel | null>(null);

  useEffect(() => {
    yaml &&
      yaml.yamlDefaults.setDiagnosticsOptions({
        validate: true,
        enableSchemaRequest: true,
        hover: true,
        completion: true,
        schemas: [
          {
            uri: "http://opstrace.com/alertmanager-schema.json",
            fileMatch: ["*"],
            schema: jsonSchema
          }
        ]
      });

  }, []);

   useEffect(() => {
      const fileUri = monaco.Uri.parse(filename);
      modelRef.current =
        monaco.editor.getModel(fileUri) ||
        monaco.editor.createModel("", "yaml", fileUri);
   }, [filename]);

  useEffect(() => {
    if (modelRef) {
      modelRef.current?.onDidChangeContent(data => {
        if (onChange && modelRef?.current) onChange(modelRef.current.getValue());
      });
    }
  }, [onChange])

  useEffect(() => {
    modelRef.current?.setValue(data)
  }, [data]);

  if (modelRef?.current) return <AutoSizingEditor model={modelRef.current} />
  else return null // TODO: show loading component here?

};

function AutoSizingEditor({ model }: { model: editor.ITextModel }) {
  return <AutoSizer>
    {({ height, width }: Size) => {
      return (
        <BaseEditor height={height} width={width} model={model} />
      );
    }}
  </AutoSizer>
}

type BaseEditorProps = {
  model: monaco.editor.ITextModel;
};

function BaseEditor({ height, width, model }: BaseEditorProps & Size) {
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

export default YamlEditor;
