import {
  TypeScriptWorker,
  ICreateData
} from "../monaco-typescript-4.1.1/tsWorker";
import * as ts from "../monaco-typescript-4.1.1/lib/typescriptServices";
import { parseFileImportUri, getFileUri } from "state/file/utils/uri";
import { CompilerOutput } from "workers/types";

export class OpScriptWorker extends TypeScriptWorker {
  constructor(ctx: monaco.worker.IWorkerContext, createData: ICreateData) {
    super(ctx, createData);
  }

  emitFile(fileName: string): Promise<CompilerOutput> {
    const output = this._languageService.getEmitOutput(fileName);
    const errors = this.getFileErrors(fileName);

    return Promise.resolve({
      errors,
      dts: output.outputFiles.find(f => f.name.endsWith(".d.ts"))?.text,
      js: output.outputFiles.find(f => f.name.endsWith(".jsx"))?.text,
      sourceMap: output.outputFiles.find(f => f.name.endsWith(".map"))?.text
    });
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
    return !!this._getModel(fileName);
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
      // try to use standard resolution
      let result = ts.resolveModuleName(
        moduleName,
        containingFile,
        this._compilerOptions,
        this
      );
      if (result.resolvedModule) {
        resolvedModules.push(result.resolvedModule);
      } else {
        // check fallback locations, for simplicity assume that module at location
        // should be represented by '.d.ts' file
        const currentFilePath = containingFile.replace(/^file:\/\/\//, "");
        const parts = parseFileImportUri(currentFilePath);
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
