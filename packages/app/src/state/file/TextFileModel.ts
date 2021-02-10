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
import axios from "axios";
import * as monaco from "monaco-editor";

import getWorkerApi, {
  EditorDecorations
} from "client/components/Editor/lib/workers";

import { sleep } from "state/utils/time";
import { getTextEditorOptions, getRange } from "./utils/monaco";
import { File, Files, IPossiblyForkedFile, onErrorHandler } from "./types";
import {
  getFileUri,
  getMonacoFileUri,
  getMonacoFileUriString
} from "./utils/uri";

class TextFileModel implements IPossiblyForkedFile {
  public file: File;
  // file this file was forked from
  public baseFile?: File;
  // latest version of base file (if this doesn't equal this.baseFile then rebaseReuired is true)
  public latestBaseFile?: File;
  // if latestBaseFile is newer than baseFile
  public rebaseRequired: boolean;
  public isNewModule: boolean;
  public isNewFile: boolean;
  // track if this file is deleted so when we merge with main, we can remove it
  public isDeletedFile: boolean;
  // only possible in live mode, and indicates that file has deviated from baseFile
  public isModifiedFile: boolean;
  // all files are live if not on main branch
  public live: boolean;
  // all files that are not live are readOnly
  public readOnly: boolean;
  // monaco text model
  public monacoModel?: monaco.editor.ITextModel;

  // --- private ---
  private contents: string | null;
  private decorations: EditorDecorations = [];
  private memoizedMonacoDecorations: string[] = [];
  private disposables: monaco.IDisposable[] = [];
  private node?: HTMLDivElement;
  private editor?: monaco.editor.IStandaloneCodeEditor;
  private editorHeight: number = 0;
  private editorWidth: number = 0;
  private onErrorHandler?: onErrorHandler;

  constructor(pff: IPossiblyForkedFile, contents?: string) {
    this.file = pff.file;
    this.rebaseRequired = pff.rebaseRequired;
    this.isNewFile = pff.isNewFile;
    this.isDeletedFile = pff.isDeletedFile;
    this.isNewModule = pff.isNewModule;
    this.isModifiedFile = pff.isModifiedFile;
    this.baseFile = pff.baseFile;
    this.latestBaseFile = pff.latestBaseFile;
    this.live = pff.file.branch_name !== "main";
    this.readOnly = !this.live;

    this.contents = contents ? contents : null;

    this.initialize();
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
    if (!this.live) {
      if (existingModel) {
        this.monacoModel = existingModel;
      } else {
        this.monacoModel = monaco.editor.createModel(
          this.contents,
          "modulescript",
          monacoUri
        );
      }
    } else {
    }
    if (this.monacoModel) {
      this.disposables.push(
        this.monacoModel.onDidChangeContent(() => this.updateDecorations())
      );
    }
    if (this.node) {
      this._render();
    }
  }

  private async updateDecorations() {
    await this.getDecorations();
    this.applyDecorations();
  }

  private applyDecorations() {
    if (!this.editor || !this.monacoModel) {
      return;
    }
    this.memoizedMonacoDecorations = this.editor.deltaDecorations(
      this.memoizedMonacoDecorations,
      this.decorations.map(({ start, end, options }) => ({
        range: getRange(this.monacoModel!, start, end),
        options
      }))
    );
  }

  private async getDecorations() {
    if (!this.monacoModel) {
      this.decorations = [];
    }
    const api = await getWorkerApi();
    const fileName = getMonacoFileUriString(this.file);
    let decorations = await api.getDecorations(fileName);
    if (decorations === null) {
      // try again
      await sleep(50);
      decorations = await api.getDecorations(fileName);
    }
    this.decorations = decorations || [];
  }

  public updateEditorLayout({
    height,
    width
  }: {
    height: number;
    width: number;
  }) {
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

  public async render(node: HTMLDivElement) {
    if (this.node && node !== this.node) {
      this.editor?.dispose();
      console.log("disposing editor and recreating.");
    }
    this.node = node;
    return this._render();
  }

  private async _render() {
    if (!this.monacoModel || this.editor) {
      console.log("returning early in _render");
      return;
    }
    this.editor = monaco.editor.create(
      this.node!,
      getTextEditorOptions({ readOnly: this.readOnly, model: this.monacoModel })
    );
    this._updateEditorLayout();
    await this.updateDecorations();
  }

  public onFileStoreChange(files: Files) {
    // check rebaseRequired
    console.log(files);
  }

  public dispose() {
    this.disposables.forEach(d => {
      try {
        d.dispose();
      } catch (err) {
        // trying to dispose something already disposed
      }
    });
    this.monacoModel?.dispose();
    this.editor?.dispose();
    this.node = undefined;
    this.onErrorHandler = undefined;
  }

  private emitError(error: Error) {
    this.onErrorHandler && this.onErrorHandler(error);
  }

  private getResourceURI(latest: boolean) {
    return `/modules/${getFileUri(this.file, {
      useLatest: latest,
      ext: true
    })}`;
  }

  private async loadFromAPI(latest: boolean) {
    try {
      const res = await axios.get<string>(this.getResourceURI(latest));
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
    if (!this.live) {
      return await this.loadFromAPI(false);
    }
    //TODO live mode
    return "";
  }
}

export default TextFileModel;
