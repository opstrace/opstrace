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
import axios from "axios";
import * as monaco from "monaco-editor";

import getWorkerApi, {
  EditorDecorations
} from "client/components/Editor/lib/workers";

import { sleep } from "state/utils/time";
import socket from "state/clients/websocket";
import { getTextEditorOptions, getRange } from "./utils/monaco";
import { File, Files, IPossiblyForkedFile, onErrorHandler } from "./types";
import {
  getFileUri,
  getMonacoFileUri,
  getMonacoFileUriString
} from "./utils/uri";
import * as actions from "state/clients/websocket/actions";
import LiveClient from "./LiveClient";

class TextFileModel implements IPossiblyForkedFile {
  // the file that is possibly forked
  file: File;
  // if this file is on a branch other than main, then baseFile points to the file on main if this is not a new file.
  // The baseFile represents the version that this file has been rebased with.
  baseFile?: File;
  // aliasFor represents the actual file (this file is an alias, e.g. "latest" version, points to actual latest file)
  aliasFor?: File;
  // latest version of base file (if this doesn't equal this.baseFile then a rebase is required to bring baseFile up to the latest version on main branch)
  latestBaseFile?: File;
  // if latestBaseFile is newer than baseFile then rebaseRequired === true;
  rebaseRequired: boolean;
  // if this module cannot be found on main branch, isNewModule === true;
  isNewModule: boolean;
  // if this file cannot be found on main branch, isNewFile === true;
  isNewFile: boolean;
  // track if this file is deleted so when we merge with main, we can remove it
  isDeletedFile: boolean;
  // only possible in live mode, and indicates that file has deviated from baseFile
  isModifiedFile: boolean;
  // all files are live if not on main branch
  live: boolean;
  // all files that are not live are readOnly
  readOnly: boolean;
  // monaco text model
  model?: monaco.editor.ITextModel;

  private liveClient?: LiveClient;
  private contents: string | null;
  private decorations: EditorDecorations = [];
  private themeDecorations: string[] = [];
  private disposables: monaco.IDisposable[] = [];
  private node?: HTMLDivElement;
  private editor?: monaco.editor.ICodeEditor;
  private editorHeight: number = 0;
  private editorWidth: number = 0;
  private onErrorHandler?: onErrorHandler;
  private viewerListeners = new Set<() => void>();

  constructor(pff: IPossiblyForkedFile, contents?: string) {
    this.file = pff.file;
    this.rebaseRequired = pff.rebaseRequired;
    this.isNewFile = pff.isNewFile;
    this.isDeletedFile = pff.isDeletedFile;
    this.isNewModule = pff.isNewModule;
    this.isModifiedFile = pff.isModifiedFile;
    this.baseFile = pff.baseFile;
    this.aliasFor = pff.aliasFor;
    this.latestBaseFile = pff.latestBaseFile;
    this.live =
      pff.file.module_version === "latest" && pff.file.branch_name !== "main";
    this.readOnly = !this.live;
    this.contents = contents ? contents : null;
    this.initialize();
  }

  get viewers() {
    if (!this.liveClient) {
      return [];
    }
    return this.liveClient.viewers;
  }

  onFileSystemReady() {
    // Reset editor content to trigger all the editor diagnostics
    // now that the file system in the worker is ready
    this.model?.setValue(this.model.getValue());
  }

  onViewersChange(callback: () => void) {
    this.viewerListeners.add(callback);
    return () => {
      this.viewerListeners.delete(callback);
    };
  }

  private onViewersChanged() {
    for (const cb of this.viewerListeners) {
      cb();
    }
  }

  private async initialize() {
    if (!this.contents) {
      this.contents = await this.getContents();
    }

    if (this.contents === null) {
      // there was an error loading the file
      return;
    }
    const monacoUri = getMonacoFileUri(this.file);
    const existingModel = monaco.editor.getModel(monacoUri);

    if (existingModel) {
      this.model = existingModel;
    } else {
      this.model = monaco.editor.createModel(
        this.contents,
        "modulescript",
        monacoUri
      );
    }

    if (this.model) {
      if (this.liveClient) {
        this.liveClient.dispose();
      }
      this.liveClient = new LiveClient({
        enable: this.live,
        model: this.model,
        file: this.file,
        onViewersChanged: () => this.onViewersChanged()
      });
      this.model.updateOptions({ tabSize: 2 });
      this.disposables.push(
        this.model.onDidChangeContent(
          (e: monaco.editor.IModelContentChangedEvent) =>
            this.onContentChanged(e)
        )
      );
    }
    if (this.node) {
      this._render();
    }
  }

  private async onContentChanged(e: monaco.editor.IModelContentChangedEvent) {
    this.updateDecorations();
    // const api = await getWorkerApi();
    // if (!this.model) {
    //   return;
    // }
    // api.updateFile(this.model.uri.toString(), this.model.getValue());
  }

  private async updateDecorations() {
    await this.getDecorations();
    this.applyDecorations();
  }

  private applyDecorations() {
    if (!this.editor || !this.model) {
      return;
    }
    this.themeDecorations = this.editor.deltaDecorations(
      this.themeDecorations,
      this.decorations.map(({ start, end, options }) => ({
        range: getRange(this.model!, start, end),
        options
      }))
    );
  }

  private async getDecorations() {
    if (!this.model) {
      this.decorations = [];
    }
    try {
      const api = await getWorkerApi();
      const fileName = getMonacoFileUriString(this.file);
      let decorations = await api.getDecorations(fileName);
      if (decorations === null) {
        // try again
        await sleep(50);
        decorations = await api.getDecorations(fileName);
      }
      this.decorations = decorations || [];
    } catch (err) {
      console.error(err);
    }
  }

  updateEditorLayout({ height, width }: { height: number; width: number }) {
    this.editorHeight = height;
    this.editorWidth = width;
    this._updateEditorLayout();
  }

  private _updateEditorLayout() {
    if (this.editor) {
      this.editor.layout({
        width: this.editorWidth,
        height: this.editorHeight
      });
    }
  }

  async render(node: HTMLDivElement) {
    if (this.node && node !== this.node) {
      this.dispose();
      this.initialize();
    }
    this.node = node;
    return this._render();
  }

  private async _render() {
    if (!this.model || this.editor) {
      return;
    }
    this.editor = monaco.editor.create(
      this.node!,
      getTextEditorOptions({ readOnly: this.readOnly, model: this.model })
    );
    this.liveClient?.setEditor(this.editor);

    this._updateEditorLayout();
    await this.updateDecorations();
  }

  onFileStoreChange(files: Files) {
    // check rebaseRequired
    console.log(files);
  }

  dispose() {
    socket.emit(actions.unsubscribeFile(this.file.id));
    this.liveClient?.dispose();
    this.liveClient = undefined;
    this.disposables.forEach(d => {
      try {
        d.dispose();
      } catch (err) {
        // trying to dispose something already disposed
      }
    });
    try {
      this.editor?.dispose();
    } catch (e) {}
    this.editor = undefined;
    this.model?.dispose();
    this.model = undefined;
    this.node = undefined;
    this.onErrorHandler = undefined;
  }

  private emitError(error: Error) {
    this.onErrorHandler && this.onErrorHandler(error);
  }

  private getResourceURI(file: File) {
    return `/modules/${getFileUri(file, {
      branch: this.file.branch_name,
      ext: true
    })}`;
  }

  private async loadFromAPI(file: File) {
    try {
      const res = await axios.get<string>(this.getResourceURI(file));
      return res.data;
    } catch (err) {
      this.emitError(err);
    }
    return null;
  }

  private async getContents() {
    if (this.contents) {
      return this.contents;
    }
    if (this.aliasFor) {
      return await this.loadFromAPI(this.aliasFor);
    }

    return await this.loadFromAPI(this.file);
  }
}

export default TextFileModel;
