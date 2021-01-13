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
import "monaco-editor";
//@ts-ignore
import EditorWorker from "worker-loader!monaco-editor/esm/vs/editor/editor.worker.js";
//@ts-ignore
import TypescriptWorker from "worker-loader!./module/opstrace.worker";
// Register typescript monarch tokens
import "monaco-editor/esm/vs/basic-languages/monaco.contribution";
// Register our typescript language features
import "./monaco-typescript-4.1.1/monaco.contribution";

let tsWorker: Worker;
//@ts-ignore
self.MonacoEnvironment = {
  getWorker: function (_: any, label: string) {
    if (label === "typescript") {
      if (!tsWorker) {
        tsWorker = new TypescriptWorker();
      }
      return tsWorker;
    }
    return new EditorWorker();
  }
};

