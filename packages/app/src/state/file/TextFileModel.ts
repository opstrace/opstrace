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
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
// Ensure our workers for monaco are registered
import "workers";

import socket from "state/clients/websocket";
import { getFileUri, getMonacoFileUri } from "./utils/uri";
import * as actions from "state/clients/websocket/actions";
import LiveClient from "./LiveClient";

interface File {
  id: string;
  path: string;
  contents: string;
  branch_name: string;
  module_name: string;
  module_scope: string;
  module_version: string;
}

class TextFileModel {
  // the file
  file: File;
  // all files are live if not on main branch
  live: boolean;
  // all files that are not live are readOnly
  readOnly: boolean;
  // monaco text model
  model: monaco.editor.ITextModel;
  // monaco editor instance. Set only when this model is focussed in the editor
  private editor?: monaco.editor.ICodeEditor;
  private contents?: string;
  private monacoEditorViewState?: monaco.editor.ICodeEditorViewState | null;
  private liveClient?: LiveClient;
  // empty array will always be the same object which is handy for react to prevent unnecessary updates
  private _emptyArray = [];
  private disposables: monaco.IDisposable[] = [];
  private viewerListeners = new Set<() => void>();

  constructor(file: File) {
    this.file = file;
    this.live = file.module_version === "latest" && file.branch_name !== "main";
    this.readOnly = !this.live;
    this.contents = file.contents;
    this.model = monaco.editor.createModel(
      file.contents || "",
      "typescript",
      getMonacoFileUri(this.file)
    );
    this.maybeSetupLiveClient();

    this.model.updateOptions({ tabSize: 2 });
  }

  private maybeSetupLiveClient() {
    if (this.contents && this.live && !this.liveClient) {
      this.liveClient = new LiveClient({
        model: this.model,
        file: this.file,
        onViewersChanged: () => this.onViewersChanged()
      });
    }
  }

  async attachEditor(editor: monaco.editor.ICodeEditor) {
    // Load contents and establish a live client
    await this.loadContents();
    this.editor = editor;
    this.liveClient?.attachEditor(editor);
    // Restore the view state we last left this file in
    if (this.monacoEditorViewState) {
      this.editor.restoreViewState(this.monacoEditorViewState);
    }
  }

  detachEditor() {
    // Store the view state in case we return to this file
    this.monacoEditorViewState = this.editor?.saveViewState();
    this.editor = undefined;
    this.liveClient?.detachEditor();
  }

  get viewers() {
    if (!this.liveClient) {
      return this._emptyArray;
    }
    return this.liveClient.viewers;
  }

  async loadContents() {
    if (this.contents) return;

    const contents = await this.getContents();
    if (contents) {
      this.contents = contents;
      this.model.setValue(contents);
      this.maybeSetupLiveClient();
    }
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

  dispose() {
    socket.emit(actions.unsubscribeFile(this.file.id));
    this.liveClient?.dispose();
    this.liveClient = undefined;
    this.disposables.forEach(d => {
      try {
        d.dispose();
      } catch (err) {}
    });
    this.model.dispose();
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
      console.error("loading file failed", err);
    }
    return null;
  }

  private async getContents() {
    return await this.loadFromAPI(this.file);
  }
}

export default TextFileModel;
