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
// Import only what is needed from monaco-editor
import "monaco-editor/esm/vs/editor/editor.api";
import "monaco-editor/esm/vs/editor/edcore.main";
import "monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution";
/* eslint-disable import/no-webpack-loader-syntax */
//@ts-ignore
import EditorWorker from "worker-loader!monaco-editor/esm/vs/editor/editor.worker.js";
//@ts-ignore
import OpScriptWebWorker from "worker-loader!./opscript/opscript.worker";
// Register our typescript language features
import {
  getTypeScriptWorker,
  typescriptDefaults,
  JsxEmit,
  ScriptTarget
} from "./monaco-typescript-4.1.1/monaco.contribution";

import type { OpScriptWorker } from "./opscript/opscriptWorker";

export const getOpScriptWorker = async (): Promise<OpScriptWorker> => {
  const worker = await getTypeScriptWorker();
  const client = await worker();
  return client as OpScriptWorker;
};
export const opScriptDefaults = typescriptDefaults;

opScriptDefaults.setEagerModelSync(true);
opScriptDefaults.setCompilerOptions({
  jsx: JsxEmit.Preserve,
  allowJs: true,
  allowNonTsExtensions: true,
  target: ScriptTarget.ES2015,
  moduleResolution: 2,
  lib: ["es6"],
  noImplicitAny: true,
  noImplicitThis: true,
  declaration: true,
  sourceMap: true
});
//@ts-ignore
/* eslint-disable-line no-restricted-globals */ self.MonacoEnvironment = {
  getWorker: function (_: any, label: string) {
    if (label === "typescript") {
      return new OpScriptWebWorker();
    }
    return new EditorWorker();
  }
};
