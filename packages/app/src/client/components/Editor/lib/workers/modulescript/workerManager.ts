/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { LanguageServiceDefaultsImpl } from ".";
import { ModuleScriptWorker } from "./msWorker";

import { IDisposable, Uri } from "monaco-editor/esm/vs/editor/editor.api";

export class WorkerManager {
  private _modeId: string;
  private _defaults: LanguageServiceDefaultsImpl;
  private _configChangeListener: IDisposable;
  private _updateExtraLibsToken: number;
  private _extraLibsChangeListener: IDisposable;

  private _worker: monaco.editor.MonacoWebWorker<ModuleScriptWorker> | null;
  private _client: Promise<ModuleScriptWorker> | null;

  constructor(modeId: string, defaults: LanguageServiceDefaultsImpl) {
    this._modeId = modeId;
    this._defaults = defaults;
    this._worker = null;
    this._client = null;
    this._configChangeListener = this._defaults.onDidChange(() =>
      this._stopWorker()
    );
    this._updateExtraLibsToken = 0;
    this._extraLibsChangeListener = this._defaults.onDidExtraLibsChange(() =>
      this._updateExtraLibs()
    );
  }

  private _stopWorker(): void {
    if (this._worker) {
      this._worker.dispose();
      this._worker = null;
    }
    this._client = null;
  }

  dispose(): void {
    this._configChangeListener.dispose();
    this._extraLibsChangeListener.dispose();
    this._stopWorker();
  }

  private async _updateExtraLibs(): Promise<void> {
    if (!this._worker) {
      return;
    }
    const myToken = ++this._updateExtraLibsToken;
    const proxy = await this._worker.getProxy();
    if (this._updateExtraLibsToken !== myToken) {
      // avoid multiple calls
      return;
    }
    proxy.updateExtraLibs(this._defaults.getExtraLibs());
  }

  private _getClient(): Promise<ModuleScriptWorker> {
    if (!this._client) {
      this._worker = monaco.editor.createWebWorker<ModuleScriptWorker>({
        moduleId: "MsWorker",
        label: this._modeId,
        keepIdleModels: true,
        // passed in to the create() method
        createData: {
          compilerOptions: this._defaults.getCompilerOptions(),
          extraLibs: this._defaults.getExtraLibs()
        }
      });

      let p = this._worker.getProxy() as Promise<ModuleScriptWorker>;

      if (this._defaults.getEagerModelSync()) {
        p = p.then(worker => {
          if (this._worker) {
            return this._worker.withSyncedResources(
              monaco.editor
                .getModels()
                .filter(model => model.getModeId() === this._modeId)
                .map(model => model.uri)
            );
          }
          return worker;
        });
      }

      this._client = p;
    }
    return this._client;
  }

  async getLanguageServiceWorker(
    ...resources: Uri[]
  ): Promise<ModuleScriptWorker> {
    let _client: ModuleScriptWorker;
    return this._getClient()
      .then(client => {
        _client = client;
      })
      .then(_ => {
        if (this._worker) {
          return this._worker.withSyncedResources(resources);
        }
        return undefined;
      })
      .then(_ => _client);
  }
}
