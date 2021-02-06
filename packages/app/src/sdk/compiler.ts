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
import path from "path";
import * as esbuild from "esbuild";
import * as ts from "typescript";
import { init, parse } from "es-module-lexer";
import chokidar from "chokidar";
import { debounce } from "lodash";
import { getEntrypoints, getVirtualDtsPath, removeExtension } from "./index";

// compile all js into BUILD_DIRECTORY
const BUILD_DIRECTORY = path.join(process.cwd(), "lib");
const DTS_FILE_NAME = "opstrace.lib.d.ts";

const options: ts.CompilerOptions = {
  jsx: ts.JsxEmit.React,
  allowJs: true,
  allowNonTsExtensions: true,
  target: ts.ScriptTarget.ES2015,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  declaration: true,
  sourceMap: true,
  module: ts.ModuleKind.ES2020,
  lib: ["es6", "dom"],
  baseUrl: "src",
  paths: {
    "client/*": ["client/*"],
    "server/*": ["server/*"],
    "state/*": ["state/*"],
    "workers/*": ["workers/*"],
    "@material-ui/*": ["@material-ui/es/*"]
  }
};

function fileExists(fileName: string): boolean {
  return ts.sys.fileExists(fileName);
}

function readFile(fileName: string): string | undefined {
  return ts.sys.readFile(fileName);
}

function writeFile(fileName: string, data: string) {
  // noop
}

function getSourceFile(fileName: string, languageVersion: ts.ScriptTarget) {
  const sourceText = ts.sys.readFile(fileName);
  return sourceText !== undefined
    ? ts.createSourceFile(fileName, sourceText, languageVersion)
    : undefined;
}

function createProgram(sourceFiles: string[]) {
  const host: ts.CompilerHost = {
    getDefaultLibFileName: () => "lib.d.ts",
    getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
    getDirectories: path => ts.sys.getDirectories(path),
    getCanonicalFileName: fileName =>
      ts.sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase(),
    getNewLine: () => ts.sys.newLine,
    useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames,
    getSourceFile,
    writeFile,
    fileExists,
    readFile,
    resolveModuleNames
  };
  return ts.createProgram(sourceFiles, options, host);
}

function resolveModuleNames(
  moduleNames: string[],
  containingFile: string
): (undefined | ts.ResolvedModule)[] {
  const resolvedModules: (undefined | ts.ResolvedModule)[] = [];
  for (const moduleName of moduleNames) {
    // try to use standard resolution
    let result = ts.resolveModuleName(moduleName, containingFile, options, {
      fileExists,
      readFile
    });
    if (result.resolvedModule) {
      resolvedModules.push(result.resolvedModule);
    } else {
      resolvedModules.push(undefined);
    }
  }
  return resolvedModules;
}

function rewritePath(
  importPath: string,
  sf: ts.SourceFile,
  filesToVisit: string[],
  afterDeclarations?: boolean
) {
  if (
    importPath.startsWith("http://") ||
    importPath.startsWith("https://") ||
    importPath.startsWith("@node_modules")
  ) {
    // don't rewrite relative imports
    return importPath;
  }

  const resolvedImports = resolveModuleNames([importPath], sf.fileName);
  const absImportPath = resolvedImports[0]?.resolvedFileName;
  if (!absImportPath) {
    return importPath;
  }
  const resolvedImportPath = path.resolve(absImportPath);
  filesToVisit.push(resolvedImportPath);

  const virtualDtsPath = getVirtualDtsPath(resolvedImportPath);

  return removeExtension(afterDeclarations ? virtualDtsPath : importPath);
}

function isDynamicImport(node: ts.Node): node is ts.CallExpression {
  return (
    ts.isCallExpression(node) &&
    node.expression.kind === ts.SyntaxKind.ImportKeyword
  );
}

function resolveTypeReferenceDirectives(sf: ts.SourceFile) {
  const resolvedTypeReferences: string[] = [];
  sf.typeReferenceDirectives.forEach(ref => {
    const resolvedFile = resolveModuleNames([ref.fileName], sf.fileName)[0]
      ?.resolvedFileName;
    if (resolvedFile) {
      resolvedTypeReferences.push(resolvedFile);
    }
  });
  return resolvedTypeReferences;
}

function getImportPathForNode(node: ts.Node, sf: ts.SourceFile) {
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
  } else if (isDynamicImport(node)) {
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
  return importPath;
}

function importExportVisitor(
  ctx: ts.TransformationContext,
  sf: ts.SourceFile,
  filesToVisit: string[],
  afterDeclarations?: boolean
) {
  filesToVisit.push(...resolveTypeReferenceDirectives(sf));

  const visitor: ts.Visitor = (node: ts.Node): ts.Node => {
    const importPath = getImportPathForNode(node, sf);

    if (importPath) {
      const rewrittenPath = rewritePath(
        importPath,
        sf,
        filesToVisit,
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
        } else if (isDynamicImport(node)) {
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

function dtsVisitor(
  sf: ts.SourceFile,
  filesToVisit: string[],
  dtsFiles: Map<string, string>,
  afterDeclarations?: boolean
) {
  filesToVisit.push(...resolveTypeReferenceDirectives(sf));

  const visitor: ts.Visitor = (node: ts.Node) => {
    const importPath = getImportPathForNode(node, sf);

    if (importPath) {
      const existingDts = dtsFiles.get(sf.fileName)!;
      const newPath = rewritePath(
        importPath,
        sf,
        filesToVisit,
        afterDeclarations
      );

      if (newPath !== importPath) {
        const existingImport = sf.text.substr(node.pos, node.end);

        const updatedImport = existingImport.replace(importPath, newPath);
        // we may have already altered this file, so we need to find
        // the originating index of this specifier. Ideally we don't need to do this
        // because we could use a transform, but not sure if transforms work when reading/emiting only .d.ts files
        const newIndex = existingDts.indexOf(existingImport);

        dtsFiles.set(
          sf.fileName,
          existingDts.slice(0, newIndex) +
            updatedImport +
            existingDts.slice(newIndex + existingImport.length)
        );
      }
    }
    return ts.forEachChild(node, visitor);
  };

  return visitor;
}

function transformImports(filesToVisit: string[], afterDeclarations?: boolean) {
  return (ctx: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
    return (sf: ts.SourceFile) =>
      ts.visitNode(
        sf,
        importExportVisitor(ctx, sf, filesToVisit, afterDeclarations)
      );
  };
}

function generateDtsFile(dtsFiles: Map<string, string>) {
  let content = `/**
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
`;
  for (let [fileName, contents] of dtsFiles.entries()) {
    let moduleName = removeExtension(getVirtualDtsPath(fileName));
    //     if (moduleName === "opstrace.com/x/react") {
    //       contents = contents.replace(`declare const _default: any;`, "");
    //       contents = contents.replace(
    //         `export default _default;`,
    //         `import React from "@node_modules/@types/react/index";
    // export = React;`
    //       );
    //     }
    content += `
declare module "${moduleName}" {
  ${contents}
}
`;
  }

  ts.sys.writeFile(
    path.resolve(process.cwd(), BUILD_DIRECTORY, DTS_FILE_NAME),
    content
  );
}

/**
 * Main function to generate dts files
 */
async function generateDts(sourceFiles: string[]) {
  const start = Date.now();
  console.log("Generating DTS..");

  const program = createProgram(sourceFiles);
  const filesVisited = new Set<string>();
  const filesToVisit = sourceFiles;

  const dtsFiles = new Map<string, string>();
  const dtsFilesVisited = new Set<string>();
  const dtsFilesToVisit: string[] = [];
  let fileName: string | undefined;

  while (filesToVisit.length && (fileName = filesToVisit.pop())) {
    if (fileName.endsWith(".d.ts")) {
      dtsFilesToVisit.push(fileName);
    }
    emitFile(fileName);
  }

  await init;

  while (dtsFilesToVisit.length && (fileName = dtsFilesToVisit.pop())) {
    parseDts(fileName);
  }
  // Write the concatenated dts file
  generateDtsFile(dtsFiles);

  console.log(`✨ dts generated, took ${Date.now() - start}ms`);

  function parseDts(fileName: string) {
    if (dtsFilesVisited.has(fileName)) {
      return;
    }
    dtsFilesVisited.add(fileName);
    // console.log("parseDts:", fileName);

    const sf = getSourceFile(fileName, ts.ScriptTarget.ES2020);
    if (!sf) {
      throw Error(`source file could not be created for: ${fileName}`);
    }
    dtsFiles.set(fileName, sf.text);
    filesToVisit.push(...resolveTypeReferenceDirectives(sf));

    ts.forEachChild(sf, dtsVisitor(sf, dtsFilesToVisit, dtsFiles, true));
    let content = dtsFiles.get(fileName)!;

    // use es-module-lexer to parse imports as well because it picks up some edge cases.
    const [imports] = parse(content);
    let delta = 0;

    for (const { s, e } of imports) {
      const importPath = content.substring(s, e);
      const newPath = rewritePath(importPath, sf, filesToVisit, true);
      if (newPath !== importPath) {
        content =
          content.slice(0, s + delta) + newPath + content.slice(e + delta);
        delta += newPath.length - importPath.length;
      }
    }
    dtsFiles.set(fileName, content);
  }

  function emitFile(fileName: string) {
    if (filesVisited.has(fileName) || dtsFilesToVisit.includes(fileName)) {
      return;
    }
    filesVisited.add(fileName);
    // console.log("emitFile:", fileName);

    program.emit(
      program.getSourceFile(fileName),
      (fileName: string, data: string) => {
        if (fileName.endsWith(".d.ts")) {
          // Add this dts to our bundled dts.
          // The module we'll declare will be of the form:
          //
          // opstrace.com/x/sdk/components/button
          // opstrace.com/x/sdk/layout/row
          // opstrace.com/x/react
          // opstrace.com/x/lodash
          const modulePath = removeExtension(getVirtualDtsPath(fileName));
          dtsFiles.set(modulePath, data);
        }
      },
      undefined,
      undefined,
      {
        after: [
          transformImports(filesToVisit, false) as ts.TransformerFactory<
            ts.SourceFile
          >
        ],
        afterDeclarations: [
          transformImports(filesToVisit, true) as ts.TransformerFactory<
            ts.SourceFile | ts.Bundle
          >
        ]
      }
    );
  }
}

const workerLoaderRegex = /^worker-loader\!(.+)/;

const workerLoader: esbuild.Plugin = {
  name: "worker-loader",
  setup(build) {
    build.onResolve({ filter: workerLoaderRegex }, args => {
      let workerPath = args.path.replace(/^worker-loader\!/, "");

      if (workerPath.startsWith(".")) {
        return {
          path: path.resolve(args.resolveDir, workerPath),
          namespace: "worker-loader"
        };
      }
      return {
        path: workerPath,
        namespace: "worker-loader"
      };
    });

    build.onLoad({ filter: /.*/, namespace: "worker-loader" }, async args => {
      let workerPath = args.path.replace(/^worker-loader\!/, "");
      let filePath = workerPath;

      if (![".js"].includes(path.extname(workerPath))) {
        workerPath += ".js";
      }

      if (![".js", ".ts"].includes(path.extname(filePath))) {
        filePath += ".ts";
      }

      const outfile = path.join(BUILD_DIRECTORY, path.basename(workerPath));
      // bundle worker entry in a sub-process
      await esbuild.build({
        entryPoints: [filePath],
        outfile,
        minify: true,
        bundle: true
      });

      // return the bundled path wrapped in a Worker
      return {
        contents: `export default class WorkerWrapper extends Worker {
          constructor() {
            super(${JSON.stringify("./" + path.basename(workerPath))});
          }
        }`
      };
    });
  }
};

const monacoLanguageLoader: esbuild.Plugin = {
  name: "monaco-language-loader",
  setup(build) {
    const resolveMap = new Map<string, string>();

    build.onResolve(
      {
        filter: /^monaco-editor\/esm\/vs\/basic-languages/
      },
      args => {
        const realPath = require.resolve(args.path);
        const prettyPath = path.basename(realPath);

        resolveMap.set(prettyPath, realPath);

        return {
          path: prettyPath,
          namespace: "monaco-language-loader"
        };
      }
    );

    build.onResolve(
      { filter: /.*/, namespace: "monaco-language-loader" },
      args => {
        const realPath = path.resolve(
          path.resolve(path.dirname(args.importer), args.path)
        );
        const prettyPath = path.basename(realPath);

        resolveMap.set(prettyPath, realPath);

        return {
          path: prettyPath,
          namespace: "monaco-language-loader"
        };
      }
    );

    build.onLoad(
      { filter: /.*/, namespace: "monaco-language-loader" },
      async args => {
        const realPath = resolveMap.get(args.path);
        if (!realPath) {
          throw Error("real path hasn't been registered");
        }
        const outfile = path.join(BUILD_DIRECTORY, args.path);
        // bundle worker entry in a sub-process
        await esbuild.build({
          entryPoints: [realPath],
          outfile,
          minify: true,
          bundle: true,
          define: {
            "process.env.NODE_ENV": '"production"',
            "process.env.BUILD_TIME": `"${Date.now().toString()}"`
          },
          format: "esm",
          platform: "browser",
          sourcemap: true,
          loader: { ".ttf": "file" }
        });

        return {
          contents: `export default ${JSON.stringify(args.path)}`
        };
      }
    );
  }
};

let externalizeSingletonLibraries: esbuild.Plugin = {
  name: "externalize-libraries",
  setup(build) {
    // Redirect all paths starting with "react/" to external skypack cdn
    build.onResolve({ filter: /^react$/ }, args => {
      return { path: "https://cdn.skypack.dev/react", external: true };
    });

    // Redirect all paths starting with "react-dom/" to external skypack cdn
    build.onResolve({ filter: /^react-dom$/ }, args => {
      return { path: "https://cdn.skypack.dev/react-dom", external: true };
    });
    // react-draggable is a cjs module with require statements, so pull in the esm version instead
    build.onResolve({ filter: /^react-draggable$/ }, args => {
      return {
        path: "https://cdn.skypack.dev/react-draggable",
        external: true
      };
    });

    build.onResolve({ filter: /^styled-components$/ }, args => {
      return {
        path: "https://cdn.skypack.dev/styled-components",
        external: true
      };
    });

    // Use the esm versions of material-ui
    build.onResolve({ filter: /^@material-ui\// }, args => {
      const paths = args.path.split("/");
      paths.splice(2, 0, "esm");

      return { path: require.resolve(paths.join("/")) };
    });
  }
};

/**
 * Bundle the library with code splitting
 */
export async function bundle(files: string[]) {
  const start = Date.now();
  console.log(`Compiling Libraries..`);

  try {
    await esbuild.build({
      entryPoints: files,
      bundle: true,
      outdir: BUILD_DIRECTORY,
      outbase: "src/sdk",
      external: ["react", "react-dom"],
      define: {
        "process.env.NODE_ENV": '"production"',
        "process.env.HASURA_GRAPHQL_ADMIN_SECRET": '""',
        "process.env.EARLY_PREVIEW": '""',
        "process.env.GRAPHQL_ENDPOINT": '""',
        "process.env.RUNTIME": '"sandbox"',
        "process.env.BUILD_TIME": `"${Date.now().toString()}"`,
        global: "self"
      },
      splitting: true,
      format: "esm",
      plugins: [
        externalizeSingletonLibraries,
        monacoLanguageLoader,
        workerLoader
      ],
      platform: "browser",
      sourcemap: true,
      loader: { ".ttf": "file" }
    });
  } catch (err) {
    console.error(err);
    return;
  }
  files.map(file =>
    console.log(
      `✨ bundled: @opstrace/${removeExtension(
        file.replace(/^.*src\/lib\//, "")
      )} took ${Date.now() - start}ms`
    )
  );
}
/**
 * Generate DTS file and bundle code with code splitting.
 */
async function compileLibrary() {
  await bundle(getEntrypoints());
  await generateDts(getEntrypoints(true));
}

function watch() {
  const watcher = chokidar.watch(
    path.resolve(process.cwd(), "src/**/*{.ts,.tsx}"),
    {
      persistent: true,
      ignored: "**/" + DTS_FILE_NAME
    }
  );
  let processing = false;
  let changedWhileProcessing = false;

  const generate = debounce(async () => {
    changedWhileProcessing = false;

    if (processing) {
      changedWhileProcessing = true;
      return;
    }

    processing = true;
    await compileLibrary();
    processing = false;

    if (changedWhileProcessing) {
      generate();
    }
  }, 300);

  watcher.on("all", generate);
}

if (process.argv.includes("--watch")) {
  watch();
} else {
  compileLibrary();
}
