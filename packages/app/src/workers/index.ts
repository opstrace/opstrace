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
import "monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution";
import "monaco-yaml/lib/esm/monaco.contribution";
/* eslint-disable import/no-webpack-loader-syntax */
/*
  ts-ignore these imports that use worker-loader:
  Cannot find module 'worker-loader!monaco-yaml/lib/esm/yaml.worker' or its corresponding type declarations
*/
//@ts-ignore
import EditorWorker from "worker-loader!monaco-editor/esm/vs/editor/editor.worker.js";
//@ts-ignore
import OpScriptWebWorker from "worker-loader!./opscript/opscript.worker";
//@ts-ignore
import YamlWorker from "worker-loader!monaco-yaml/lib/esm/yaml.worker";

// Register our typescript language features
import {
  getTypeScriptWorker,
  typescriptDefaults,
  JsxEmit,
  ScriptTarget,
  ModuleKind,
  ModuleResolutionKind
} from "./monaco-typescript-4.1.1/monaco.contribution";

import { languages } from "monaco-editor/esm/vs/editor/editor.api";

import type { OpScriptWorker } from "./opscript/opscriptWorker";
// import buildTime from "client/buildInfo";

export const getOpScriptWorker = async (): Promise<OpScriptWorker> => {
  const worker = await getTypeScriptWorker();
  const client = await worker();
  return client as OpScriptWorker;
};
export const opScriptDefaults = typescriptDefaults;
// @ts-ignore
export const { yaml } = languages || {};

// Disabled temporarily

// (async function fetchSDKTypings() {
//   if (process.env.RUNTIME === "sandbox") {
//     return;
//   }
//   try {
//     const res = await fetch(`/_/modules/opstrace.lib.d.ts?mtime=${buildTime}`);
//     const content = await res.text();
//     opScriptDefaults.addExtraLib(content, "opstrace.lib.d.ts");
//   } catch (err) {
//     console.error(err);
//   }
// })();

opScriptDefaults.setEagerModelSync(true);
opScriptDefaults.setCompilerOptions({
  jsx: JsxEmit.React,
  allowJs: true,
  allowNonTsExtensions: true,
  allowSyntheticDefaultImports: true,
  target: ScriptTarget.ES2015,
  moduleResolution: ModuleResolutionKind.NodeJs,
  module: ModuleKind.ESNext,
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
    if (label === "yaml") {
      return new YamlWorker();
    }
    return new EditorWorker();
  }
};
