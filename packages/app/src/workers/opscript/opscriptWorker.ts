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
import {
  TypeScriptWorker,
  ICreateData
} from "../monaco-typescript-4.1.1/tsWorker";
import * as ts from "../monaco-typescript-4.1.1/lib/typescriptServices";
import { parseFileImportUri, getFileUri } from "state/file/utils/uri";
import {
  rewriteRegistryImport,
  isRegistryImport
} from "state/file/utils/registry";
import { CompilerOutput } from "workers/types";
import buildTime from "client/buildInfo";

function parseFileName(fileName: string) {
  return parseFileImportUri(fileName.replace(/^file:\/\/\//, ""));
}

export class OpScriptWorker extends TypeScriptWorker {
  private opstraceLibFiles: string[] = [];
  constructor(ctx: monaco.worker.IWorkerContext, createData: ICreateData) {
    super(ctx, createData);
    this.importExportVisitor = this.importExportVisitor.bind(this);
    this.rewritePath = this.rewritePath.bind(this);
    this.isDynamicImport = this.isDynamicImport.bind(this);
    this.transformImports = this.transformImports.bind(this);
    this.fetchLibFiles();
  }

  async fetchLibFiles() {
    try {
      const res = await fetch(
        `/_/modules/opstrace.lib.filelist?mtime=${buildTime}`
      );
      const content = await res.json();
      this.opstraceLibFiles = content.files;
    } catch (err) {
      console.error(err);
    }
  }

  rewritePath(
    importPath: string,
    sf: ts.SourceFile,
    afterDeclarations?: boolean
  ) {
    if (
      importPath.startsWith(".") ||
      importPath.startsWith("http://") ||
      importPath.startsWith("https://")
    ) {
      // don't rewrite relative imports
      return importPath;
    }
    if (isRegistryImport(importPath)) {
      // Use the Skypack CDN to serve up the esm version.
      return rewriteRegistryImport(importPath);
    }

    const resolvedImports = this.resolveModuleNames([importPath], sf.fileName);
    const absImportPath = resolvedImports[0]?.resolvedFileName;
    if (!absImportPath) {
      return importPath;
    }

    const parsedCurrentFile = parseFileName(sf.fileName);
    if (!parsedCurrentFile) {
      return importPath;
    }
    const currentFileUri = getFileUri(parsedCurrentFile);
    const parsedImportFile = parseFileName(absImportPath);
    if (!parsedImportFile) {
      return importPath;
    }
    const importFileUri = getFileUri(parsedImportFile, {
      external: parsedImportFile.external
    });

    const relativePath =
      new Array(
        currentFileUri.split("/").slice(0, -1).length +
          (parsedImportFile.external ? 1 : 0)
      )
        .fill("../")
        .reduce((rel, curr) => {
          return curr + rel;
        }, "") + importFileUri;

    return afterDeclarations ? relativePath + ".d.ts" : relativePath + ".js";
  }

  isDynamicImport(node: ts.Node): node is ts.CallExpression {
    return (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    );
  }

  importExportVisitor(
    ctx: ts.TransformationContext,
    sf: ts.SourceFile,
    afterDeclarations?: boolean
  ) {
    const visitor: ts.Visitor = (node: ts.Node): ts.Node => {
      let importPath: string = "";
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier
      ) {
        const importPathWithQuotes = node.moduleSpecifier.getText(sf);
        importPath = importPathWithQuotes.substr(
          1,
          importPathWithQuotes.length - 2
        );
      } else if (this.isDynamicImport(node)) {
        const importPathWithQuotes = node.arguments[0].getText(sf);
        importPath = importPathWithQuotes.substr(
          1,
          importPathWithQuotes.length - 2
        );
      } else if (
        ts.isImportTypeNode(node) &&
        ts.isLiteralTypeNode(node.argument) &&
        ts.isStringLiteral(node.argument.literal)
      ) {
        importPath = node.argument.literal.text;
      }

      if (importPath) {
        const rewrittenPath = this.rewritePath(
          importPath,
          sf,
          afterDeclarations
        );

        // Only rewrite if we changed the value
        if (rewrittenPath !== importPath) {
          if (ts.isImportDeclaration(node)) {
            return ctx.factory.updateImportDeclaration(
              node,
              node.decorators,
              node.modifiers,
              node.importClause,
              ctx.factory.createStringLiteral(rewrittenPath)
            );
          } else if (ts.isExportDeclaration(node)) {
            return ctx.factory.updateExportDeclaration(
              node,
              node.decorators,
              node.modifiers,
              node.isTypeOnly,
              node.exportClause,
              ctx.factory.createStringLiteral(rewrittenPath)
            );
          } else if (this.isDynamicImport(node)) {
            return ctx.factory.updateCallExpression(
              node,
              node.expression,
              node.typeArguments,
              ctx.factory.createNodeArray([
                ctx.factory.createStringLiteral(rewrittenPath)
              ])
            );
          } else if (ts.isImportTypeNode(node)) {
            return ctx.factory.updateImportTypeNode(
              node,
              ctx.factory.createLiteralTypeNode(
                ctx.factory.createStringLiteral(rewrittenPath)
              ),
              node.qualifier,
              node.typeArguments,
              node.isTypeOf
            );
          }
        }
        return node;
      }
      return ts.visitEachChild(node, visitor, ctx);
    };

    return visitor;
  }
  transformImports(afterDeclarations?: boolean) {
    return (ctx: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
      return (sf: ts.SourceFile) =>
        ts.visitNode(sf, this.importExportVisitor(ctx, sf, afterDeclarations));
    };
  }

  emitFile(fileName: string): Promise<CompilerOutput> {
    const program = this._languageService.getProgram();
    let dts: string = "";
    let js: string = "";
    let map: string = "";

    try {
      program?.emit(
        program.getSourceFile(fileName),
        (fileName: string, data: string) => {
          if (fileName.endsWith(".d.ts")) {
            dts = data;
          } else if (fileName.endsWith(".map")) {
            map = data;
          } else {
            js = data;
          }
        },
        undefined,
        undefined,
        {
          after: [
            this.transformImports(false) as ts.TransformerFactory<ts.SourceFile>
          ],
          afterDeclarations: [
            this.transformImports(true) as ts.TransformerFactory<
              ts.SourceFile | ts.Bundle
            >
          ]
        }
      );

      return Promise.resolve({
        dts,
        js,
        sourceMap: map,
        errors: this.getFileErrors(fileName)
      });
    } catch (err) {
      return Promise.resolve({
        dts,
        js,
        sourceMap: map,
        errors: []
      });
    }
  }

  getFileErrors(fileName: string) {
    const allDiagnostics = this._languageService
      .getCompilerOptionsDiagnostics()
      .concat(this._languageService.getSyntacticDiagnostics(fileName))
      .concat(this._languageService.getSemanticDiagnostics(fileName));

    return allDiagnostics.map(diagnostic => {
      let message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        "\n"
      );
      if (diagnostic.file) {
        let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
          diagnostic.start!
        );
        return {
          fileName: diagnostic.file.fileName,
          lineNumber: line + 1,
          columnNumber: character + 1,
          message
        };
      } else {
        return {
          message
        };
      }
    });
  }

  fileExists(fileName: string): boolean {
    return !!this._getModel(fileName) || fileName in this._extraLibs;
  }

  readFile(fileName: string): string | undefined {
    return this._getModel(fileName)?.getValue();
  }

  resolveModuleNames(
    moduleNames: string[],
    containingFile: string
  ): (ts.ResolvedModule | undefined)[] {
    const resolvedModules: (ts.ResolvedModule | undefined)[] = [];
    for (const moduleName of moduleNames) {
      try {
        // try to use standard resolution
        let result = ts.resolveModuleName(
          moduleName,
          containingFile,
          this._compilerOptions,
          this
        );

        if (result.resolvedModule) {
          resolvedModules.push(result.resolvedModule);
          continue;
        }

        const parts = parseFileName(containingFile);
        if (!parts) {
          resolvedModules.push(undefined);
          continue;
        }
        const moduleNameParts = parseFileImportUri(
          `/${parts.branch_name}/${moduleName}`
        );
        if (!moduleNameParts) {
          resolvedModules.push(undefined);
          continue;
        }

        // Try resolve known registry files
        if (this.opstraceLibFiles.includes(moduleName)) {
          resolvedModules.push({
            resolvedFileName: getFileUri(moduleNameParts, {
              external: true,
              ext: true
            })
          });
          continue;
        }
        // Try resolve local files
        const locationsToCheck = [
          // try to resolve on current branch
          `file:///${getFileUri(moduleNameParts, {
            branch: parts.branch_name,
            encodeAtSymbol: true
          })}.tsx`,
          // try to resolve on main branch
          `file:///${getFileUri(moduleNameParts, {
            branch: "main",
            encodeAtSymbol: true
          })}.tsx`
        ];

        const resolved = locationsToCheck.find(location => {
          if (this.fileExists(location)) {
            resolvedModules.push({
              resolvedFileName: location
            });
            return true;
          }
          return false;
        });
        if (!resolved) {
          resolvedModules.push(undefined);
        }
      } catch (err) {
        resolvedModules.push(undefined);
        console.error(err);
      }
    }
    return resolvedModules;
  }
}

export function create(
  ctx: monaco.worker.IWorkerContext,
  createData: ICreateData
): OpScriptWorker {
  return new OpScriptWorker(ctx, createData);
}
