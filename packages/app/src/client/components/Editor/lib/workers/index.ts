/**
 * Copyright 2019-2021 Opstrace, Inc.
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

/* eslint-disable import/no-webpack-loader-syntax, no-restricted-globals */
import "monaco-editor/esm/vs/editor/editor.api";
import { register, getWorkerApi } from "./modulescript";
//@ts-ignore
import EditorWorker from "worker-loader!monaco-editor/esm/vs/editor/editor.worker.js";
//@ts-ignore
import MSWorker from "worker-loader!./modulescript/ms.worker";

export type { EditorDecorations } from "./modulescript";

register();

let msWorker: Worker;
//@ts-ignore
self.MonacoEnvironment = {
  getWorker: function (_: any, label: string) {
    if (label === "modulescript") {
      if (!msWorker) {
        msWorker = new MSWorker();
      }
      return msWorker;
    }
    return new EditorWorker();
  }
};

export default getWorkerApi;
