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
import {
  editor,
  Uri,
  IDisposable
} from "monaco-editor/esm/vs/editor/editor.api";
import { yaml } from "workers";

import AutoSizer, { Size } from "react-virtualized-auto-sizer";
import { YamlEditorProps } from "../lib/types";
import { GlobalEditorCSS } from "../lib/themes";
import { getTextEditorOptions } from "./utils";

const YamlEditor = ({
  filename,
  jsonSchema,
  data,
  onChange,
  configViewer
}: YamlEditorProps) => {
  const fileUri = Uri.parse(filename);

  const modelRef = useRef<editor.IModel | null>(
    editor.getModel(fileUri) || editor.createModel(data, "yaml", fileUri)
  );

  const subscriptionRef = useRef<IDisposable | null>(null);

  useEffect(() => {
    if (configViewer) return;
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
  }, [jsonSchema, configViewer]);

  useEffect(() => {
    if (modelRef?.current && onChange) {
      subscriptionRef.current = modelRef.current?.onDidChangeContent(() => {
        if (modelRef?.current) onChange(modelRef.current.getValue(), filename);
      });
    }
    return () => {
      subscriptionRef.current?.dispose();
      subscriptionRef.current = null;
    };
  }, [onChange, filename]);

  useEffect(() => {
    // Only update the model if we're not updating with the default empty string.
    // This ensures we keep any changes in the model after navigating away and back again
    if (data.length) {
      modelRef.current?.setValue(data);
    }
  }, [data]);

  if (modelRef?.current)
    return (
      <AutoSizingEditor model={modelRef.current} configViewer={configViewer} />
    );
  else return null; // TODO: show loading component here?
};

function AutoSizingEditor(props: { model: editor.ITextModel }) {
  return (
    <AutoSizer>
      {({ height, width }: Size) => {
        return <BaseEditor height={height} width={width} {...props} />;
      }}
    </AutoSizer>
  );
}

type BaseEditorProps = {
  model: editor.ITextModel;
  configViewer?: boolean;
};

function BaseEditor({
  height,
  width,
  model,
  configViewer
}: BaseEditorProps & Size) {
  const editorRef = useRef<null | editor.ICodeEditor>(null);
  const currentModelRef = useRef<editor.IModel>(model);

  const editorContainer = useCallback(async node => {
    if (node) {
      editorRef.current = editor.create(
        node,
        getTextEditorOptions({
          readOnly: configViewer === true ? true : false,
          model: currentModelRef.current
        })
      );
    } else {
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
