/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* eslint-disable no-restricted-globals */

import * as worker from "monaco-editor-core/esm/vs/editor/editor.worker";
import { ModuleScriptWorker, ICreateData } from "./msWorker";

self.onmessage = () => {
  // ignore the first message
  worker.initialize(
    (ctx: monaco.worker.IWorkerContext, createData: ICreateData) => {
      return new ModuleScriptWorker(ctx, createData);
    }
  );
};
