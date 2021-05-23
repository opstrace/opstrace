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
import YamlWorker from "worker-loader!monaco-yaml/lib/esm/yaml.worker";

import { languages } from "monaco-editor/esm/vs/editor/editor.api";

// @ts-ignore
export const { yaml } = languages || {};

//@ts-ignore
/* eslint-disable-line no-restricted-globals */ self.MonacoEnvironment = {
  getWorker: function (_: any, label: string) {
    if (label === "yaml") {
      return new YamlWorker();
    }
    return new EditorWorker();
  }
};
