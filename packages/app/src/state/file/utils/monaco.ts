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

import { EditorOptions } from "../types";

export function getRange(
  model: monaco.editor.ITextModel,
  start: number,
  end: number
): monaco.IRange {
  const p1 = model.getPositionAt(start);
  const p2 = model.getPositionAt(end);
  const { lineNumber: startLineNumber, column: startColumn } = p1;
  const { lineNumber: endLineNumber, column: endColumn } = p2;

  return { startLineNumber, startColumn, endLineNumber, endColumn };
}

export function getTextEditorOptions({
  readOnly,
  model
}: {
  readOnly: boolean;
  model: monaco.editor.ITextModel;
}): EditorOptions {
  return {
    readOnly,
    model,
    cursorStyle: "line",
    automaticLayout: false,
    minimap: {
      enabled: false
    },
    formatOnType: true,
    fontSize: 13,
    roundedSelection: false,
    renderLineHighlight: "all",
    scrollbar: {
      useShadows: true,
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10
    }
  };
}
