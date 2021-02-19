/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
"use strict";

import * as ts from "./lib/typescriptServices";
import { libFileMap } from "./lib/lib";
import {
  Diagnostic,
  IExtraLibs,
  TypeScriptWorker as ITypeScriptWorker
} from "./monaco.contribution";
import { worker } from "monaco-editor/esm/vs/editor/editor.api";

export class TypeScriptWorker
  implements ts.LanguageServiceHost, ITypeScriptWorker {
  // --- model sync -----------------------

  public _ctx: worker.IWorkerContext;
  public _extraLibs: IExtraLibs = Object.create(null);
  public _languageService = ts.createLanguageService(this);
  public _compilerOptions: ts.CompilerOptions;

  constructor(ctx: worker.IWorkerContext, createData: ICreateData) {
    this._ctx = ctx;
    this._compilerOptions = createData.compilerOptions;
    this._extraLibs = createData.extraLibs;
  }

  // --- language service host ---------------

  getCompilationSettings(): ts.CompilerOptions {
    return this._compilerOptions;
  }

  getScriptFileNames(): string[] {
    let models = this._ctx.getMirrorModels().map(model => model.uri.toString());
    return models.concat(Object.keys(this._extraLibs));
  }

  public _getModel(fileName: string): worker.IMirrorModel | null {
    let models = this._ctx.getMirrorModels();
    for (let i = 0; i < models.length; i++) {
      if (models[i].uri.toString() === fileName) {
        return models[i];
      }
    }
    return null;
  }

  getScriptVersion(fileName: string): string {
    let model = this._getModel(fileName);
    if (model) {
      return model.version.toString();
    } else if (this.isDefaultLibFileName(fileName)) {
      // default lib is static
      return "1";
    } else if (fileName in this._extraLibs) {
      return String(this._extraLibs[fileName].version);
    }
    return "";
  }

  async getScriptText(fileName: string): Promise<string | undefined> {
    return this._getScriptText(fileName);
  }

  _getScriptText(fileName: string): string | undefined {
    let text: string;
    let model = this._getModel(fileName);
    const libizedFileName = "lib." + fileName + ".d.ts";
    if (model) {
      // a true editor model
      text = model.getValue();
    } else if (fileName in libFileMap) {
      text = libFileMap[fileName];
    } else if (libizedFileName in libFileMap) {
      text = libFileMap[libizedFileName];
    } else if (fileName in this._extraLibs) {
      // extra lib
      text = this._extraLibs[fileName].content;
    } else {
      return;
    }

    return text;
  }

  getScriptSnapshot(fileName: string): ts.IScriptSnapshot | undefined {
    const text = this._getScriptText(fileName);
    if (text === undefined) {
      return;
    }

    return <ts.IScriptSnapshot>{
      getText: (start, end) => text.substring(start, end),
      getLength: () => text.length,
      getChangeRange: () => undefined
    };
  }

  getScriptKind?(fileName: string): ts.ScriptKind {
    const suffix = fileName.substr(fileName.lastIndexOf(".") + 1);
    switch (suffix) {
      case "ts":
        return ts.ScriptKind.TS;
      case "tsx":
        return ts.ScriptKind.TSX;
      case "js":
        return ts.ScriptKind.JS;
      case "jsx":
        return ts.ScriptKind.JSX;
      default:
        return this.getCompilationSettings().allowJs
          ? ts.ScriptKind.JS
          : ts.ScriptKind.TS;
    }
  }

  getCurrentDirectory(): string {
    return "";
  }

  getDefaultLibFileName(options: ts.CompilerOptions): string {
    switch (options.target) {
      /* tslint:disable-next-line */
      case 99 /* ESNext */:
        const esnext = "lib.esnext.full.d.ts";
        if (esnext in libFileMap || esnext in this._extraLibs) return esnext;
        return "lib.es6.d.ts";
      case 7 /* ES2020 */:
      case 6 /* ES2019 */:
      case 5 /* ES2018 */:
      case 4 /* ES2017 */:
      case 3 /* ES2016 */:
      case 2 /* ES2015 */:
      default:
        // Support a dynamic lookup for the ES20XX version based on the target
        // which is safe unless TC39 changes their numbering system
        const eslib = `lib.es${2013 + (options.target || 99)}.full.d.ts`;
        // Note: This also looks in _extraLibs, If you want
        // to add support for additional target options, you will need to
        // add the extra dts files to _extraLibs via the API.
        if (eslib in libFileMap || eslib in this._extraLibs) {
          return eslib;
        }

        return "lib.es6.d.ts"; // We don't use lib.es2015.full.d.ts due to breaking change.
      case 1:
      case 0:
        return "lib.d.ts";
    }
  }

  isDefaultLibFileName(fileName: string): boolean {
    return fileName === this.getDefaultLibFileName(this._compilerOptions);
  }

  async getLibFiles(): Promise<Record<string, string>> {
    return libFileMap;
  }

  // --- language features

  public static clearFiles(diagnostics: ts.Diagnostic[]): Diagnostic[] {
    // Clear the `file` field, which cannot be JSON'yfied because it
    // contains cyclic data structures.
    diagnostics.forEach(diag => {
      diag.file = undefined;
      const related = <ts.Diagnostic[]>diag.relatedInformation;
      if (related) {
        related.forEach(diag2 => (diag2.file = undefined));
      }
    });
    return <Diagnostic[]>diagnostics;
  }

  async getSyntacticDiagnostics(fileName: string): Promise<Diagnostic[]> {
    const diagnostics = this._languageService.getSyntacticDiagnostics(fileName);
    return TypeScriptWorker.clearFiles(diagnostics);
  }

  async getSemanticDiagnostics(fileName: string): Promise<Diagnostic[]> {
    const diagnostics = this._languageService.getSemanticDiagnostics(fileName);
    return TypeScriptWorker.clearFiles(diagnostics);
  }

  async getSuggestionDiagnostics(fileName: string): Promise<Diagnostic[]> {
    const diagnostics = this._languageService.getSuggestionDiagnostics(
      fileName
    );
    return TypeScriptWorker.clearFiles(diagnostics);
  }

  async getCompilerOptionsDiagnostics(fileName: string): Promise<Diagnostic[]> {
    const diagnostics = this._languageService.getCompilerOptionsDiagnostics();
    return TypeScriptWorker.clearFiles(diagnostics);
  }

  async getCompletionsAtPosition(
    fileName: string,
    position: number
  ): Promise<ts.CompletionInfo | undefined> {
    return this._languageService.getCompletionsAtPosition(
      fileName,
      position,
      undefined
    );
  }

  async getCompletionEntryDetails(
    fileName: string,
    position: number,
    entry: string
  ): Promise<ts.CompletionEntryDetails | undefined> {
    return this._languageService.getCompletionEntryDetails(
      fileName,
      position,
      entry,
      undefined,
      undefined,
      undefined
    );
  }

  async getSignatureHelpItems(
    fileName: string,
    position: number
  ): Promise<ts.SignatureHelpItems | undefined> {
    return this._languageService.getSignatureHelpItems(
      fileName,
      position,
      undefined
    );
  }

  async getQuickInfoAtPosition(
    fileName: string,
    position: number
  ): Promise<ts.QuickInfo | undefined> {
    return this._languageService.getQuickInfoAtPosition(fileName, position);
  }

  async getOccurrencesAtPosition(
    fileName: string,
    position: number
  ): Promise<ReadonlyArray<ts.ReferenceEntry> | undefined> {
    return this._languageService.getOccurrencesAtPosition(fileName, position);
  }

  async getDefinitionAtPosition(
    fileName: string,
    position: number
  ): Promise<ReadonlyArray<ts.DefinitionInfo> | undefined> {
    return this._languageService.getDefinitionAtPosition(fileName, position);
  }

  async getReferencesAtPosition(
    fileName: string,
    position: number
  ): Promise<ts.ReferenceEntry[] | undefined> {
    return this._languageService.getReferencesAtPosition(fileName, position);
  }

  async getNavigationBarItems(
    fileName: string
  ): Promise<ts.NavigationBarItem[]> {
    return this._languageService.getNavigationBarItems(fileName);
  }

  async getFormattingEditsForDocument(
    fileName: string,
    options: ts.FormatCodeOptions
  ): Promise<ts.TextChange[]> {
    return this._languageService.getFormattingEditsForDocument(
      fileName,
      options
    );
  }

  async getFormattingEditsForRange(
    fileName: string,
    start: number,
    end: number,
    options: ts.FormatCodeOptions
  ): Promise<ts.TextChange[]> {
    return this._languageService.getFormattingEditsForRange(
      fileName,
      start,
      end,
      options
    );
  }

  async getFormattingEditsAfterKeystroke(
    fileName: string,
    postion: number,
    ch: string,
    options: ts.FormatCodeOptions
  ): Promise<ts.TextChange[]> {
    return this._languageService.getFormattingEditsAfterKeystroke(
      fileName,
      postion,
      ch,
      options
    );
  }

  async findRenameLocations(
    fileName: string,
    position: number,
    findInStrings: boolean,
    findInComments: boolean,
    providePrefixAndSuffixTextForRename: boolean
  ): Promise<readonly ts.RenameLocation[] | undefined> {
    return this._languageService.findRenameLocations(
      fileName,
      position,
      findInStrings,
      findInComments,
      providePrefixAndSuffixTextForRename
    );
  }

  async getRenameInfo(
    fileName: string,
    position: number,
    options: ts.RenameInfoOptions
  ): Promise<ts.RenameInfo> {
    return this._languageService.getRenameInfo(fileName, position, options);
  }

  async getEmitOutput(fileName: string): Promise<ts.EmitOutput> {
    return this._languageService.getEmitOutput(fileName);
  }

  async getCodeFixesAtPosition(
    fileName: string,
    start: number,
    end: number,
    errorCodes: number[],
    formatOptions: ts.FormatCodeOptions
  ): Promise<ReadonlyArray<ts.CodeFixAction>> {
    const preferences = {};
    try {
      return this._languageService.getCodeFixesAtPosition(
        fileName,
        start,
        end,
        errorCodes,
        formatOptions,
        preferences
      );
    } catch {
      return [];
    }
  }

  async updateExtraLibs(extraLibs: IExtraLibs): Promise<void> {
    this._extraLibs = extraLibs;
  }
}

export interface ICreateData {
  compilerOptions: ts.CompilerOptions;
  extraLibs: IExtraLibs;
  customWorkerPath?: string;
}

/** The shape of the factory */
export interface CustomTSWebWorkerFactory {
  (
    TSWorkerClass: typeof TypeScriptWorker,
    tsc: typeof ts,
    libs: Record<string, string>
  ): typeof TypeScriptWorker;
}

declare global {
  var customTSWorkerFactory: CustomTSWebWorkerFactory | undefined;
}

export function create(
  ctx: worker.IWorkerContext,
  createData: ICreateData
): TypeScriptWorker {
  let TSWorkerClass = TypeScriptWorker;
  if (createData.customWorkerPath) {
    if (typeof importScripts === "undefined") {
      console.warn(
        "Monaco is not using webworkers for background tasks, and that is needed to support the customWorkerPath flag"
      );
    } else {
      importScripts(createData.customWorkerPath);

      const workerFactoryFunc: CustomTSWebWorkerFactory | undefined =
        self.customTSWorkerFactory;
      if (!workerFactoryFunc) {
        throw new Error(
          `The script at ${createData.customWorkerPath} does not add customTSWorkerFactory to self`
        );
      }

      TSWorkerClass = workerFactoryFunc(TypeScriptWorker, ts, libFileMap);
    }
  }

  return new TSWorkerClass(ctx, createData);
}
