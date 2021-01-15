import * as edworker from "monaco-editor-core/esm/vs/editor/editor.worker";
import { OpScriptWorker } from "./opscriptWorker";
import { ICreateData } from "../monaco-typescript-4.1.1/tsWorker";
import { worker } from "monaco-editor-core";

self.onmessage = () => {
  // ignore the first message
  edworker.initialize((ctx: worker.IWorkerContext, createData: ICreateData) => {
    return new OpScriptWorker(ctx, createData);
  });
};
