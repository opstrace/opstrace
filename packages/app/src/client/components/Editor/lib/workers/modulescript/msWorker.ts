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

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as ts from "./lib/typescriptServices";
import path from "path";
import { libFileMap } from "./lib/lib";
import { IExtraLibs, EditorDecorations } from "./index";
import getSyntaxClassname, { getSyntaxKindName } from "./utils/syntaxClass";
import { Files, File } from "state/file/types";
import semver from "semver";
import { parseFileUriWithoutBranch } from "state/file/utils/uri";
import { sanitizeFilePath, sanitizeScope } from "state/utils/sanitize";

export class ModuleScriptWorker
  implements
    ts.LanguageServiceHost,
    monaco.languages.typescript.TypeScriptWorker {
  private _ctx: monaco.worker.IWorkerContext;
  private _extraLibs: IExtraLibs = Object.create(null);
  private _languageService = ts.createLanguageService(this);
  private _compilerOptions: ts.CompilerOptions;

  private filesByModule = new Map<string, Files>();
  private branch = "main";

  constructor(ctx: monaco.worker.IWorkerContext, createData: ICreateData) {
    this._ctx = ctx;
    this._compilerOptions = createData.compilerOptions;
    this._extraLibs = createData.extraLibs;
  }

  getModuleUri(name: string, scope: string) {
    return scope ? `${sanitizeScope(scope)}/${name}` : name;
  }

  setBranchFiles(branch: string, files: Files) {
    if (branch !== this.branch) {
      // Reset our source files
      this.filesByModule.clear();
    }
    files.forEach(f => {
      const module = this.getModuleUri(f.module_name, f.module_scope);

      this.filesByModule.set(
        module,
        (this.filesByModule.get(module) || []).concat([f])
      );
    });
    this.branch = branch;
  }

  getDecorations(fileName: string): null | EditorDecorations {
    const mirrorModel = this._getModel(fileName);
    if (!mirrorModel) {
      return null;
    }

    const file = ts.createSourceFile(
      fileName,
      mirrorModel.getValue(),
      ts.ScriptTarget.ES2015,
      undefined,
      ts.ScriptKind.TSX
    );

    const monacoDecorations: {
      start: number;
      end: number;
      options: monaco.editor.IModelDecorationOptions;
    }[] = [];

    if (file) {
      const visitNode = (node: ts.Node, pathTypes: string[]) => {
        const inlineClassName = getSyntaxClassname(pathTypes);
        // uncomment to debug tokens for decoration coloring
        // if (node.getChildren(file).length === 0) {
        //   console.log(node, node.getText(file), pathTypes.join("."));
        // }
        if (inlineClassName) {
          const options: monaco.editor.IModelDecorationOptions = {
            inlineClassName
          };
          monacoDecorations.push({ start: node.pos, end: node.end, options });
        }

        const visitChild = (childType: string, child: ts.Node) => {
          const path = [childType, ...pathTypes];
          // limit context to <child>.<direct-parent>.<grandparent>
          // this is enough context to match 95% of styling cases
          visitNode(child, path.length > 3 ? path.slice(0, 3) : path);
        };

        node.getChildren(file).forEach((child, idx) => {
          const childType = getSyntaxKindName(child.kind);
          // For property access types like:
          //    subject.accessor()
          //    subject.accessor
          //    subject["accessor]
          // add index to all children since subject and accessor
          // have the same node kind. This allows us to identify:
          // subject: Identifier[0].PropertyAccessExpression
          // accessor: Identifier[2].PropertyAccessExpression
          if (node.kind === ts.SyntaxKind.PropertyAccessExpression) {
            return visitChild(childType + `[${idx}]`, child);
          }
          visitChild(childType, child);
        });
      };

      visitNode(file, []);
    }

    return monacoDecorations;
  }

  getSourceFile(
    fileName: string,
    languageVersion: ts.ScriptTarget,
    onError?: (message: string) => void
  ) {
    console.log("getSourcefile:", fileName);

    return ts.createSourceFile(fileName, "empty", languageVersion);
  }

  ensureUriHasExtension(uri: string, extension?: string) {
    // We have to ensure uri has extension because the compiler will vomit if it doesn't
    const lastPart = uri.split("/").pop() || "";
    const ext = lastPart.split(".").pop();

    if (!ext) {
      return uri + ".ts";
    }
    if (ext === uri || ext === lastPart) {
      return uri + ".ts";
    }
    if (!["tsx", "tsx"].includes(ext)) {
      return uri.substr(0, uri.length - ext.length) + "ts";
    }
    return uri;
  }

  resolveModuleNames(
    moduleNames: string[],
    containingFile: string
  ): (ts.ResolvedModule | undefined)[] {
    return moduleNames.map<ts.ResolvedModule | undefined>(name => {
      if (name.startsWith(".")) {
        // Relative import
        const paths = containingFile.replace(/^module:\/\//, "").split("/");
        // pop current file name
        paths.pop();
        containingFile = paths.join("/");
        const resolvedPath = "module://" + path.join(containingFile, name);
        const resolvedFile = this.getFile(resolvedPath);
        return resolvedFile
          ? {
              resolvedFileName: this.ensureUriHasExtension(resolvedPath)
            }
          : undefined;
      }
      if (name.startsWith("https://") || name.startsWith("http://")) {
        // external import
        return {
          resolvedFileName: this.ensureUriHasExtension(name)
        };
      }
      const resolvedFile = this.getFile(name);
      return resolvedFile
        ? {
            resolvedFileName: "module://" + this.ensureUriHasExtension(name)
          }
        : undefined;
    });
  }

  getFileVersionsByBranch(fileName: string) {
    const nullResult = {
      current: [],
      main: []
    };

    const attrs = parseFileUriWithoutBranch(fileName);
    if (!attrs) {
      return nullResult;
    }
    const module = this.getModuleUri(attrs.module, attrs.scope);

    if (!this.filesByModule.has(module)) {
      return nullResult;
    }
    const moduleFiles = this.filesByModule.get(module) || [];
    const main: File[] = [];
    const current = moduleFiles.filter(f => {
      if (sanitizeFilePath(f.path) !== attrs.path) {
        // not the correct file path
        return false;
      }
      if (f.branch_name === "main") {
        main.push(f);
        return false;
      }
      return true;
    });
    return {
      main,
      current
    };
  }
  getFile(fileName: string) {
    console.log(fileName);
    if (fileName.startsWith("https://")) {
      // external https import
    }
    if (fileName.startsWith("http://")) {
      // external https import
    }
    if (!fileName.startsWith(".")) {
      // Absolute import
    }
    fileName = fileName.replace(/^module:\/\//, "");

    const attrs = parseFileUriWithoutBranch(fileName);
    if (!attrs) {
      return;
    }
    const versions = this.getFileVersionsByBranch(fileName);

    if (versions.current.length) {
      return this.resolveVersion(versions.current, attrs.version);
    }
    return this.resolveVersion(versions.main, attrs.version);
  }

  resolveVersion(files: Files, range: string) {
    const versions = files.map(f => f.module_version);

    if (versions.includes(range)) {
      return files.find(f => f.module_version === range);
    }
    // resolve the max version satisfied by range
    const maxVersion = semver.maxSatisfying(versions, range);
    const resolvedFile = files.find(f => f.module_version === maxVersion);

    return resolvedFile;
  }
  writeFile(fileName: string, content: string) {
    // do nothing
  }
  getCurrentDirectory() {
    return "/";
  }
  getDirectories(path: string) {
    return [];
  }
  fileExists(fileName: string) {
    return !!this.getFile(fileName);
  }
  readFile(fileName: string) {
    console.log("reading file:", fileName);
    return "";
  }
  getCanonicalFileName(fileName: string) {
    return fileName;
  }
  useCaseSensitiveFileNames() {
    return true;
  }
  getNewLine() {
    return "\n";
  }
  getEnvironmentVariable() {
    return "";
  }

  // --- language service host ---------------

  getCompilationSettings(): ts.CompilerOptions {
    return this._compilerOptions;
  }

  getScriptFileNames(): string[] {
    let models = this._ctx.getMirrorModels().map(model => model.uri.toString());
    return models.concat(Object.keys(this._extraLibs));
  }

  private _getModel(fileName: string): monaco.worker.IMirrorModel | null {
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

  getScriptText(fileName: string): Promise<string | undefined> {
    return Promise.resolve(this._getScriptText(fileName));
  }

  _getScriptText(fileName: string): string | undefined {
    let text: string;
    let model = this._getModel(fileName);
    if (model) {
      // a true editor model
      text = model.getValue();
    } else if (fileName in libFileMap) {
      text = libFileMap[fileName];
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

    return {
      getText: (start, end) => text.substring(start, end),
      getLength: () => text.length,
      getChangeRange: () => undefined
    } as ts.IScriptSnapshot;
  }

  getScriptKind?(fileName: string): ts.ScriptKind {
    return ts.ScriptKind.TSX;
  }

  getDefaultLibFileName(options: ts.CompilerOptions): string {
    const defaultLib = () => {
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
    };
    switch (options.target) {
      case 99 /* ESNext */:
        const esnext = "lib.esnext.full.d.ts";
        if (esnext in libFileMap || esnext in this._extraLibs) {
          return esnext;
        } else {
          return defaultLib();
        }
      // falls through
      case 7 /* ES2020 */:
      case 6 /* ES2019 */:
      case 5 /* ES2018 */:
      case 4 /* ES2017 */:
      case 3 /* ES2016 */:
      case 2 /* ES2015 */:
      default:
        return defaultLib();
      case 1:
      case 0:
        return "lib.d.ts";
    }
  }

  isDefaultLibFileName(fileName: string): boolean {
    return fileName === this.getDefaultLibFileName(this._compilerOptions);
  }

  getLibFiles(): Promise<Record<string, string>> {
    return Promise.resolve(libFileMap);
  }

  // --- language features

  private static clearFiles(
    diagnostics: ts.Diagnostic[]
  ): monaco.languages.typescript.Diagnostic[] {
    // Clear the `file` field, which cannot be JSON'yfied because it
    // contains cyclic data structures.
    diagnostics.forEach(diag => {
      diag.file = undefined;
      const related = diag.relatedInformation as ts.Diagnostic[];
      if (related) {
        related.forEach(diag2 => (diag2.file = undefined));
      }
    });
    return diagnostics as monaco.languages.typescript.Diagnostic[];
  }

  getSyntacticDiagnostics(
    fileName: string
  ): Promise<monaco.languages.typescript.Diagnostic[]> {
    const diagnostics = this._languageService.getSyntacticDiagnostics(fileName);
    return Promise.resolve(ModuleScriptWorker.clearFiles(diagnostics));
  }

  getSemanticDiagnostics(
    fileName: string
  ): Promise<monaco.languages.typescript.Diagnostic[]> {
    const diagnostics = this._languageService.getSemanticDiagnostics(fileName);
    return Promise.resolve(ModuleScriptWorker.clearFiles(diagnostics));
  }

  getSuggestionDiagnostics(
    fileName: string
  ): Promise<monaco.languages.typescript.Diagnostic[]> {
    const diagnostics = this._languageService.getSuggestionDiagnostics(
      fileName
    );
    return Promise.resolve(ModuleScriptWorker.clearFiles(diagnostics));
  }

  getCompilerOptionsDiagnostics(
    fileName: string
  ): Promise<monaco.languages.typescript.Diagnostic[]> {
    const diagnostics = this._languageService.getCompilerOptionsDiagnostics();
    return Promise.resolve(ModuleScriptWorker.clearFiles(diagnostics));
  }

  getCompletionsAtPosition(
    fileName: string,
    position: number
  ): Promise<ts.CompletionInfo | undefined> {
    const res = this._languageService.getCompletionsAtPosition(
      fileName,
      position,
      undefined
    );
    return Promise.resolve(res);
  }

  getCompletionEntryDetails(
    fileName: string,
    position: number,
    entry: string
  ): Promise<ts.CompletionEntryDetails | undefined> {
    return Promise.resolve(
      this._languageService.getCompletionEntryDetails(
        fileName,
        position,
        entry,
        undefined,
        undefined,
        undefined
      )
    );
  }

  getSignatureHelpItems(
    fileName: string,
    position: number
  ): Promise<ts.SignatureHelpItems | undefined> {
    return Promise.resolve(
      this._languageService.getSignatureHelpItems(fileName, position, undefined)
    );
  }

  getQuickInfoAtPosition(
    fileName: string,
    position: number
  ): Promise<ts.QuickInfo | undefined> {
    return Promise.resolve(
      this._languageService.getQuickInfoAtPosition(fileName, position)
    );
  }

  getOccurrencesAtPosition(
    fileName: string,
    position: number
  ): Promise<ReadonlyArray<ts.ReferenceEntry> | undefined> {
    return Promise.resolve(
      this._languageService.getOccurrencesAtPosition(fileName, position)
    );
  }

  getDefinitionAtPosition(
    fileName: string,
    position: number
  ): Promise<ReadonlyArray<ts.DefinitionInfo> | undefined> {
    return Promise.resolve(
      this._languageService.getDefinitionAtPosition(fileName, position)
    );
  }

  getReferencesAtPosition(
    fileName: string,
    position: number
  ): Promise<ts.ReferenceEntry[] | undefined> {
    return Promise.resolve(
      this._languageService.getReferencesAtPosition(fileName, position)
    );
  }

  getNavigationBarItems(fileName: string): Promise<ts.NavigationBarItem[]> {
    return Promise.resolve(
      this._languageService.getNavigationBarItems(fileName)
    );
  }

  getFormattingEditsForDocument(
    fileName: string,
    options: ts.FormatCodeOptions
  ): Promise<ts.TextChange[]> {
    return Promise.resolve(
      this._languageService.getFormattingEditsForDocument(fileName, options)
    );
  }

  getFormattingEditsForRange(
    fileName: string,
    start: number,
    end: number,
    options: ts.FormatCodeOptions
  ): Promise<ts.TextChange[]> {
    return Promise.resolve(
      this._languageService.getFormattingEditsForRange(
        fileName,
        start,
        end,
        options
      )
    );
  }

  getFormattingEditsAfterKeystroke(
    fileName: string,
    postion: number,
    ch: string,
    options: ts.FormatCodeOptions
  ): Promise<ts.TextChange[]> {
    return Promise.resolve(
      this._languageService.getFormattingEditsAfterKeystroke(
        fileName,
        postion,
        ch,
        options
      )
    );
  }

  findRenameLocations(
    fileName: string,
    position: number,
    findInStrings: boolean,
    findInComments: boolean,
    providePrefixAndSuffixTextForRename: boolean
  ): Promise<readonly ts.RenameLocation[] | undefined> {
    return Promise.resolve(
      this._languageService.findRenameLocations(
        fileName,
        position,
        findInStrings,
        findInComments,
        providePrefixAndSuffixTextForRename
      )
    );
  }

  getRenameInfo(
    fileName: string,
    position: number,
    options: ts.RenameInfoOptions
  ): Promise<ts.RenameInfo> {
    return Promise.resolve(
      this._languageService.getRenameInfo(fileName, position, options)
    );
  }

  getEmitOutput(fileName: string): Promise<ts.EmitOutput> {
    return Promise.resolve(this._languageService.getEmitOutput(fileName));
  }

  getCodeFixesAtPosition(
    fileName: string,
    start: number,
    end: number,
    errorCodes: number[],
    formatOptions: ts.FormatCodeOptions
  ): Promise<ReadonlyArray<ts.CodeFixAction>> {
    // const preferences = {};
    // disable this for now after getting errors when trying to apply code fixes to unreachable code
    // Error: "Token and statement should start at the same point. {"statementKind":"VariableStatement","tokenKind":"StringLiteral","errorCode":7027,"start":2093,"length":0}"
    return Promise.resolve(
      []
      // this._languageService.getCodeFixesAtPosition(
      //   fileName,
      //   start,
      //   end,
      //   errorCodes,
      //   formatOptions,
      //   preferences
      // )
    );
  }

  updateExtraLibs(extraLibs: IExtraLibs) {
    this._extraLibs = extraLibs;
  }
}

export interface ICreateData {
  compilerOptions: ts.CompilerOptions;
  extraLibs: IExtraLibs;
}

export function create(
  ctx: monaco.worker.IWorkerContext,
  createData: ICreateData
): ModuleScriptWorker {
  return new ModuleScriptWorker(ctx, createData);
}
