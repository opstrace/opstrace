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
import { parseFileUriWithoutBranch } from "state/file/utils/uri";
// import semver from "semver";

// "/DOM.d.ts" => "/lib.dom.d.ts"
const libize = (path: string) => path.replace("/", "/lib.").toLowerCase();
function notImplemented(methodName: string): any {
  console.error(`Method '${methodName}' is not implemented.`);
}

// only allow es2015/es6
const libFiles = [
  "lib.d.ts",
  // "lib.dom.d.ts",
  // "lib.dom.iterable.d.ts",
  // "lib.webworker.d.ts",
  // "lib.webworker.importscripts.d.ts",
  // "lib.scripthost.d.ts",
  "lib.es5.d.ts",
  "lib.es6.d.ts",
  "lib.es2015.collection.d.ts",
  "lib.es2015.core.d.ts",
  "lib.es2015.d.ts",
  "lib.es2015.generator.d.ts",
  "lib.es2015.iterable.d.ts",
  "lib.es2015.promise.d.ts",
  "lib.es2015.proxy.d.ts",
  "lib.es2015.reflect.d.ts",
  "lib.es2015.symbol.d.ts",
  "lib.es2015.symbol.wellknown.d.ts"
  // "lib.es2016.array.include.d.ts",
  // "lib.es2016.d.ts",
  // "lib.es2016.full.d.ts",
  // "lib.es2017.d.ts",
  // "lib.es2017.full.d.ts",
  // "lib.es2017.intl.d.ts",
  // "lib.es2017.object.d.ts",
  // "lib.es2017.sharedmemory.d.ts",
  // "lib.es2017.string.d.ts",
  // "lib.es2017.typedarrays.d.ts",
  // "lib.es2018.asyncgenerator.d.ts",
  // "lib.es2018.asynciterable.d.ts",
  // "lib.es2018.d.ts",
  // "lib.es2018.full.d.ts",
  // "lib.es2018.intl.d.ts",
  // "lib.es2018.promise.d.ts",
  // "lib.es2018.regexp.d.ts",
  // "lib.es2019.array.d.ts",
  // "lib.es2019.d.ts",
  // "lib.es2019.full.d.ts",
  // "lib.es2019.object.d.ts",
  // "lib.es2019.string.d.ts",
  // "lib.es2019.symbol.d.ts",
  // "lib.es2020.d.ts",
  // "lib.es2020.full.d.ts",
  // "lib.es2020.string.d.ts",
  // "lib.es2020.symbol.wellknown.d.ts",
  // "lib.es2020.bigint.d.ts",
  // "lib.es2020.promise.d.ts",
  // "lib.es2020.sharedmemory.d.ts",
  // "lib.es2020.intl.d.ts",
  // "lib.esnext.array.d.ts",
  // "lib.esnext.asynciterable.d.ts",
  // "lib.esnext.bigint.d.ts",
  // "lib.esnext.d.ts",
  // "lib.esnext.full.d.ts",
  // "lib.esnext.intl.d.ts",
  // "lib.esnext.symbol.d.ts",
];

export class ModuleScriptWorker
  implements
    ts.LanguageServiceHost,
    monaco.languages.typescript.TypeScriptWorker {
  private _ctx: monaco.worker.IWorkerContext;
  private _extraLibs: IExtraLibs = Object.create(null);
  private _languageService = ts.createLanguageService(this);
  private _compilerOptions: ts.CompilerOptions;
  // credit to https://github.com/microsoft/TypeScript-Website/blob/v2/packages/typescript-vfs/src/index.ts
  private files = new Map<string, string>();
  private sourceFiles = new Map<string, ts.SourceFile>();
  private fileVersions = new Map<string, string>();
  private projectVersion = 0;
  // private branch = "main";

  constructor(ctx: monaco.worker.IWorkerContext, createData: ICreateData) {
    this._ctx = ctx;
    this._compilerOptions = createData.compilerOptions;
    this._extraLibs = createData.extraLibs;
    this.initFS();
  }

  getDefaultModuleContent() {
    return `export default function () {}`;
  }

  initFS() {
    // add our default libs
    libFiles.forEach(lib => {
      if (!(lib in libFileMap)) {
        console.error(`lib ${lib} not found in libFileMap`);
        return;
      }
      this.files.set("/" + lib, libFileMap[lib]);
    });
  }

  setBranchFiles(branch: string, files: string[]) {
    files.forEach(f => {
      // set content to empty string to begin with
      if (!this.fileExists(f)) {
        this.writeFile(f, this.getDefaultModuleContent());
      }
    });
    // this.branch = branch;
  }

  getExistingSourceFile(fileName: string) {
    return this.sourceFiles.get(fileName);
  }

  getProjectVersion() {
    return this.projectVersion.toString();
  }

  updateFile(fileName: string, content: string) {
    let sourceFile: ts.SourceFile;
    // get this source file from the language service itself
    // because there may already be a source file for the existing mirrorModel
    const prevSourceFile = this._languageService
      .getProgram()!
      .getSourceFile(fileName);

    if (prevSourceFile) {
      const prevFullContents = prevSourceFile.text;
      // TODO: Validate if the default text span has a fencepost error?
      const prevTextSpan = ts.createTextSpan(0, prevFullContents.length);
      const newText =
        prevFullContents.slice(0, prevTextSpan.start) +
        content +
        prevFullContents.slice(prevTextSpan.start + prevTextSpan.length);
      sourceFile = ts.updateSourceFile(prevSourceFile, newText, {
        span: prevTextSpan,
        newLength: content.length
      });
    } else {
      sourceFile = ts.createSourceFile(
        fileName,
        content,
        ts.ScriptTarget.ES2015,
        undefined,
        ts.ScriptKind.TSX
      );
    }
    this.incFileVersion(sourceFile.fileName);
    this.writeFile(sourceFile.fileName, sourceFile.text);
    this.sourceFiles.set(sourceFile.fileName, sourceFile);
  }

  incFileVersion(fileName: string) {
    this.projectVersion++;
    this.fileVersions.set(fileName, this.getProjectVersion());
  }

  ensureUriHasExtension(uri: string, defaultExt: string = ".tsx") {
    const ext = path.extname(uri);

    if (!ext) {
      return uri + defaultExt;
    }
    if (ext === ".") {
      return uri.replace(/\.$/, defaultExt);
    }
    return uri;
  }

  resolvePath(path: string) {
    console.log("resolvePath", path);
    return path;
  }

  getSourceFile(fileName: string) {
    console.log("getSourceFile", fileName);
    return;
  }

  resolveModuleNames(
    moduleNames: string[],
    containingFile: string
  ): ts.ResolvedModule[] {
    const res: ts.ResolvedModule[] = [];
    for (const moduleName of moduleNames) {
      if (
        moduleName.startsWith("https://") ||
        moduleName.startsWith("http://")
      ) {
        res.push({
          resolvedFileName: this.ensureUriHasExtension(moduleName)
        });
      } else if (moduleName.startsWith(".")) {
        const resolvedFileName = monaco.Uri.parse(
          path.join(
            path.dirname(containingFile),
            this.ensureUriHasExtension(moduleName)
          )
        ).toString();
        if (
          this.fileExists(resolvedFileName) &&
          !this.getExistingSourceFile(resolvedFileName)
        ) {
          console.log("resolving fileExists");
        }
        res.push({
          resolvedFileName
        });
      } else {
        const resolvedFileName = this.ensureUriHasExtension(moduleName);
        const attrs = parseFileUriWithoutBranch(resolvedFileName);
        console.log(attrs);
        res.push({
          resolvedFileName
        });
      }
    }
    return res;
  }

  fileExists(fileName: string) {
    if (fileName.startsWith("https://") || fileName.startsWith("http://")) {
      return false;
    }
    const withExtension = monaco.Uri.parse(
      this.ensureUriHasExtension(fileName)
    ).toString();
    const exists =
      this.files.has(withExtension) ||
      this.files.has(libize(fileName)) ||
      !!this._getModel(withExtension);

    return exists;
  }

  getCurrentDirectory() {
    return "/";
  }

  getDirectories() {
    console.log("get directories");
    return [];
  }

  directoryExists(directory: string) {
    console.log("directory exists? ", directory);
    return Array.from(this.files.keys()).some(path =>
      path.startsWith(directory)
    );
  }

  readDirectory() {
    console.log("read directory");
    return [];
  }

  readFile(fileName: string) {
    fileName = decodeURIComponent(fileName);
    // console.log("readFile", fileName);
    return this.files.get(fileName) || this.files.get(libize(fileName));
  }

  write() {
    return notImplemented("write");
  }

  writeFile(fileName: string, contents: string) {
    // console.log("writeFile", fileName);
    this.files.set(fileName, contents);
    this.incFileVersion(fileName);
  }

  getScriptFileNames() {
    // console.log("getScriptFileNames");
    const fileNames = [...this.sourceFiles.keys()];
    this._ctx
      .getMirrorModels()
      .map(model => model.uri.toString())
      .forEach(name => {
        if (!fileNames.includes(name)) {
          fileNames.push(name);
        }
      });
    return fileNames;
  }

  getScriptSnapshot(fileName: string): ts.IScriptSnapshot | undefined {
    const text = this._getScriptText(fileName);
    return text ? ts.ScriptSnapshot.fromString(text) : undefined;
  }

  _getScriptText(fileName: string): string | undefined {
    let text: string | undefined;
    let model = this._getModel(fileName);
    if (model) {
      // a true editor model
      text = model.getValue();
      console.log(text);
      // Important to get the content here too
    } else if (this.fileExists(fileName)) {
      // console.log("_getscriptText", fileName);
      text = this.readFile(fileName);
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

  getScriptVersion(fileName: string) {
    const model = this._getModel(fileName);
    const version =
      model?.version.toString() || this.fileVersions.get(fileName) || "1";
    console.log("getScriptVersion", fileName, version);
    return version;
  }

  getDefaultLibFileName(options: ts.CompilerOptions) {
    return "/" + "lib.es6.d.ts";
  }
  // getSourceFile(fileName: string) {
  //   const sourceFile = this.sourceFiles.get(fileName);

  //   if (sourceFile) {
  //     return sourceFile;
  //   }

  //   const newSourceFile = ts.createSourceFile(
  //     fileName,
  //     this.readFile(fileName)!,
  //     this._compilerOptions.target || ts.ScriptTarget.ES2015,
  //     false
  //   );
  //   this.sourceFiles.set(newSourceFile.fileName, newSourceFile);

  //   return newSourceFile;
  // }

  // getFile(uri: monaco.Uri) {
  //   if (uri.scheme === "https://") {
  //     // external https import
  //   }
  //   if (uri.scheme === "http://") {
  //     // external https import
  //   }

  //   const attrs = parseFileUriWithoutBranch(uri.fsPath);
  //   if (!attrs) {
  //     return;
  //   }
  //   const versions = this.getFileVersionsByBranch(uri.fsPath);
  //   // try to resolve the version on the current branch first and fall back to main
  //   return (
  //     this.resolveVersion(versions.current, attrs.version) ||
  //     this.resolveVersion(versions.main, attrs.version)
  //   );
  // }

  // resolveVersion(files: Files, range: string) {
  //   const versions = files.map(f => f.module_version);

  //   if (versions.includes(range)) {
  //     return files.find(f => f.module_version === range);
  //   }
  //   // resolve the max version satisfied by range
  //   const maxVersion = semver.maxSatisfying(versions, range);
  //   return files.find(f => f.module_version === maxVersion);
  // }

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

  // --- language service host ---------------

  getCompilationSettings(): ts.CompilerOptions {
    return this._compilerOptions;
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

  getScriptText(fileName: string): Promise<string | undefined> {
    return Promise.resolve(this._getScriptText(fileName));
  }

  getScriptKind?(fileName: string): ts.ScriptKind {
    return ts.ScriptKind.TSX;
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
    console.log("getSyntacticDiagnostics", diagnostics);
    return Promise.resolve(ModuleScriptWorker.clearFiles(diagnostics));
  }

  getSemanticDiagnostics(
    fileName: string
  ): Promise<monaco.languages.typescript.Diagnostic[]> {
    const diagnostics = this._languageService.getSemanticDiagnostics(fileName);
    console.log("getSemanticDiagnostics", diagnostics);
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
