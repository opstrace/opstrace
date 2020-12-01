/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { WorkerManager } from "./workerManager";
import { ModuleScriptWorker } from "./msWorker";
import { LanguageServiceDefaultsImpl } from ".";
import * as languageFeatures from "./languageFeatures";

import { Uri } from "monaco-editor/esm/vs/editor/editor.api";

let moduleScriptWorker: (...uris: Uri[]) => Promise<ModuleScriptWorker>;
let msWorkerResolver: (value: typeof moduleScriptWorker) => void;
let resolveMSWorker = new Promise((resolve: typeof msWorkerResolver) => {
  msWorkerResolver = resolve;
});

export function setupModuleScript(defaults: LanguageServiceDefaultsImpl): void {
  moduleScriptWorker = setupMode(defaults, "modulescript");
}

export function getModuleScriptWorker(): Promise<
  (...uris: Uri[]) => Promise<ModuleScriptWorker>
> {
  return resolveMSWorker;
}

function setupMode(
  defaults: LanguageServiceDefaultsImpl,
  modeId: string
): (...uris: Uri[]) => Promise<ModuleScriptWorker> {
  const client = new WorkerManager(modeId, defaults);
  const worker = (...uris: Uri[]): Promise<ModuleScriptWorker> => {
    return client.getLanguageServiceWorker(...uris);
  };

  msWorkerResolver(worker);

  const libFiles = new languageFeatures.LibFiles(worker);

  monaco.languages.registerCompletionItemProvider(
    modeId,
    new languageFeatures.SuggestAdapter(worker)
  );
  monaco.languages.registerSignatureHelpProvider(
    modeId,
    new languageFeatures.SignatureHelpAdapter(worker)
  );
  monaco.languages.registerHoverProvider(
    modeId,
    new languageFeatures.QuickInfoAdapter(worker)
  );
  monaco.languages.registerDocumentHighlightProvider(
    modeId,
    new languageFeatures.OccurrencesAdapter(worker)
  );
  monaco.languages.registerDefinitionProvider(
    modeId,
    new languageFeatures.DefinitionAdapter(libFiles, worker)
  );
  monaco.languages.registerReferenceProvider(
    modeId,
    new languageFeatures.ReferenceAdapter(libFiles, worker)
  );
  monaco.languages.registerDocumentSymbolProvider(
    modeId,
    new languageFeatures.OutlineAdapter(worker)
  );
  monaco.languages.registerDocumentRangeFormattingEditProvider(
    modeId,
    new languageFeatures.FormatAdapter(worker)
  );
  monaco.languages.registerOnTypeFormattingEditProvider(
    modeId,
    new languageFeatures.FormatOnTypeAdapter(worker)
  );
  monaco.languages.registerCodeActionProvider(
    modeId,
    new languageFeatures.CodeActionAdaptor(worker)
  );
  monaco.languages.registerRenameProvider(
    modeId,
    new languageFeatures.RenameAdapter(worker)
  );
  new languageFeatures.DiagnosticsAdapter(libFiles, defaults, modeId, worker);

  return worker;
}
