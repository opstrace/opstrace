/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
"use strict";

import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import type * as mode from "./msMode";
import type { ModuleScriptWorker } from "./msWorker";

//@ts-ignore
import * as lang from "monaco-editor/esm/vs/basic-languages/typescript/typescript.js";

import {
  IDisposable,
  IEvent,
  Emitter
} from "monaco-editor/esm/vs/editor/editor.api";

export { typescriptVersion } from "./lib/typescriptServicesMetadata"; // do not import the whole typescriptServices here

export type SyntaxClass =
  | "type"
  | "scope"
  | "function"
  | "variable"
  | "number"
  | "string"
  | "comment"
  | "constant"
  | "directive"
  | "control"
  | "operator"
  | "modifier"
  | "punctuation";

export type EditorDecorations = {
  start: number;
  end: number;
  options: monaco.editor.IModelDecorationOptions;
}[];

// --- TypeScript configuration and defaults ---------

export interface IExtraLib {
  content: string;
  version: number;
}

export interface IExtraLibs {
  [path: string]: IExtraLib;
}

export class LanguageServiceDefaultsImpl
  implements monaco.languages.typescript.LanguageServiceDefaults {
  private _onDidChange = new Emitter<void>();
  private _onDidExtraLibsChange = new Emitter<void>();

  private _extraLibs: IExtraLibs;
  private _eagerModelSync: boolean;
  private _compilerOptions!: monaco.languages.typescript.CompilerOptions;
  private _diagnosticsOptions!: monaco.languages.typescript.DiagnosticsOptions;
  private _onDidExtraLibsChangeTimeout: number;

  constructor(
    compilerOptions: monaco.languages.typescript.CompilerOptions,
    diagnosticsOptions: monaco.languages.typescript.DiagnosticsOptions
  ) {
    this._extraLibs = Object.create(null);
    this._eagerModelSync = true;
    this.setCompilerOptions(compilerOptions);
    this.setDiagnosticsOptions(diagnosticsOptions);
    this._onDidExtraLibsChangeTimeout = -1;
  }

  get onDidChange(): IEvent<void> {
    return this._onDidChange.event;
  }

  get onDidExtraLibsChange(): IEvent<void> {
    return this._onDidExtraLibsChange.event;
  }

  getExtraLibs(): IExtraLibs {
    return this._extraLibs;
  }

  addExtraLib(content: string, _filePath?: string): IDisposable {
    let filePath: string;
    if (typeof _filePath === "undefined") {
      filePath = `ts:extralib-${Math.random().toString(36).substring(2, 15)}`;
    } else {
      filePath = _filePath;
    }

    if (
      this._extraLibs[filePath] &&
      this._extraLibs[filePath].content === content
    ) {
      // no-op, there already exists an extra lib with this content
      return {
        dispose: () => {}
      };
    }

    let myVersion = 1;
    if (this._extraLibs[filePath]) {
      myVersion = this._extraLibs[filePath].version + 1;
    }

    this._extraLibs[filePath] = {
      content: content,
      version: myVersion
    };
    this._fireOnDidExtraLibsChangeSoon();

    return {
      dispose: () => {
        let extraLib = this._extraLibs[filePath];
        if (!extraLib) {
          return;
        }
        if (extraLib.version !== myVersion) {
          return;
        }

        delete this._extraLibs[filePath];
        this._fireOnDidExtraLibsChangeSoon();
      }
    };
  }

  setExtraLibs(libs: { content: string; filePath?: string }[]): void {
    // clear out everything
    this._extraLibs = Object.create(null);

    if (libs && libs.length > 0) {
      for (const lib of libs) {
        const filePath =
          lib.filePath ||
          `ts:extralib-${Math.random().toString(36).substring(2, 15)}`;
        const content = lib.content;
        this._extraLibs[filePath] = {
          content: content,
          version: 1
        };
      }
    }

    this._fireOnDidExtraLibsChangeSoon();
  }

  private _fireOnDidExtraLibsChangeSoon(): void {
    if (this._onDidExtraLibsChangeTimeout !== -1) {
      // already scheduled
      return;
    }
    this._onDidExtraLibsChangeTimeout = setTimeout(() => {
      this._onDidExtraLibsChangeTimeout = -1;
      this._onDidExtraLibsChange.fire(undefined);
    }, 0);
  }

  getCompilerOptions(): monaco.languages.typescript.CompilerOptions {
    return this._compilerOptions;
  }

  setCompilerOptions(
    options: monaco.languages.typescript.CompilerOptions
  ): void {
    this._compilerOptions = options || Object.create(null);
    this._onDidChange.fire(undefined);
  }

  getDiagnosticsOptions(): monaco.languages.typescript.DiagnosticsOptions {
    return this._diagnosticsOptions;
  }

  setDiagnosticsOptions(
    options: monaco.languages.typescript.DiagnosticsOptions
  ): void {
    this._diagnosticsOptions = options || Object.create(null);
    this._onDidChange.fire(undefined);
  }

  setMaximumWorkerIdleTime(value: number): void {}

  setEagerModelSync(value: boolean) {
    // doesn't fire an event since no
    // worker restart is required here
    this._eagerModelSync = value;
  }

  getEagerModelSync() {
    return this._eagerModelSync;
  }
}

//#region enums copied from typescript to prevent loading the entire typescriptServices ---

enum ScriptTarget {
  ES3 = 0,
  ES5 = 1,
  ES2015 = 2,
  ES2016 = 3,
  ES2017 = 4,
  ES2018 = 5,
  ES2019 = 6,
  ES2020 = 7,
  ESNext = 99,
  JSON = 100,
  Latest = ESNext
}

//#endregion

const typescriptDefaults = new LanguageServiceDefaultsImpl(
  { allowNonTsExtensions: true, target: ScriptTarget.ES2015, jsx: 1 },
  { noSemanticValidation: false, noSyntaxValidation: false }
);

async function getModuleScriptWorker(): Promise<
  (...uris: monaco.Uri[]) => Promise<ModuleScriptWorker>
> {
  return getMode().then(mode => mode.getModuleScriptWorker());
}

// --- Registration to monaco editor ---

function getMode(): Promise<typeof mode> {
  return import("./msMode");
}

export interface WorkerAPI {
  getCurrentDirectory(): Promise<
    ReturnType<ModuleScriptWorker["getCurrentDirectory"]>
  >;
  getDecorations(
    fileName: string
  ): Promise<ReturnType<ModuleScriptWorker["getDecorations"]>>;
  getBatchedActions(): ReturnType<ModuleScriptWorker["getBatchedActions"]>;
}

export async function getWorkerApi(): Promise<WorkerAPI> {
  const getter = await getModuleScriptWorker();
  const worker = await getter();

  return {
    getCurrentDirectory() {
      return Promise.resolve(worker.getCurrentDirectory());
    },
    getDecorations(fileName: string) {
      return Promise.resolve(worker.getDecorations(fileName));
    },
    getBatchedActions() {
      return worker.getBatchedActions();
    }
  };
}

export function register() {
  monaco.languages.register({
    id: "modulescript",
    extensions: [".ms"]
  });
  //@ts-ignore
  monaco.languages.setMonarchTokensProvider("modulescript", language);

  monaco.languages.onLanguage("modulescript", async () => {
    monaco.languages.setLanguageConfiguration("modulescript", lang.conf);
    return getMode().then(mode => mode.setupModuleScript(typescriptDefaults));
  });
}

var language = {
  // Set defaultToken to invalid to see what you do not tokenize yet
  defaultToken: "invalid",
  tokenPostfix: ".ts",
  keywords: [
    "abstract",
    "as",
    "break",
    "case",
    "catch",
    "class",
    "continue",
    "const",
    "constructor",
    "debugger",
    "declare",
    "default",
    "delete",
    "do",
    "else",
    "enum",
    "export",
    "extends",
    "false",
    "finally",
    "for",
    "from",
    "function",
    "get",
    "if",
    "implements",
    "import",
    "in",
    "infer",
    "instanceof",
    "interface",
    "is",
    "keyof",
    "let",
    "module",
    "namespace",
    "never",
    "new",
    "package",
    "private",
    "protected",
    "public",
    "readonly",
    "require",
    "global",
    "return",
    "set",
    "static",
    "super",
    "switch",
    "symbol",
    "this",
    "throw",
    "true",
    "try",
    "type",
    "typeof",
    "unique",
    "var",
    "void",
    "while",
    "with",
    "yield",
    "async",
    "await",
    "of"
  ],
  typeKeywords: ["any", "boolean", "number", "object", "string", "undefined"],
  operators: [
    "<=",
    ">=",
    "==",
    "!=",
    "===",
    "!==",
    "=>",
    "+",
    "-",
    "**",
    "*",
    "/",
    "%",
    "++",
    "--",
    "<<",
    "</",
    ">>",
    ">>>",
    "&",
    "|",
    "^",
    "!",
    "~",
    "&&",
    "||",
    "??",
    "?",
    ":",
    "=",
    "+=",
    "-=",
    "*=",
    "**=",
    "/=",
    "%=",
    "<<=",
    ">>=",
    ">>>=",
    "&=",
    "|=",
    "^=",
    "@"
  ],
  // we include these common regular expressions
  symbols: /[=><!~?:&|+\-*\/\^%]+/,
  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
  digits: /\d+(_+\d+)*/,
  octaldigits: /[0-7]+(_+[0-7]+)*/,
  binarydigits: /[0-1]+(_+[0-1]+)*/,
  hexdigits: /[[0-9a-fA-F]+(_+[0-9a-fA-F]+)*/,
  regexpctl: /[(){}\[\]\$\^|\-*+?\.]/,
  regexpesc: /\\(?:[bBdDfnrstvwWn0\\\/]|@regexpctl|c[A-Z]|x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4})/,
  // The main tokenizer for our languages
  tokenizer: {
    root: [[/[{}]/, "delimiter.bracket"], { include: "common" }],
    common: [
      // identifiers and keywords
      [
        /[a-z_$][\w$]*/,
        {
          cases: {
            "@typeKeywords": "type",
            "@keywords": "keyword",
            "@default": "identifier"
          }
        }
      ],
      [/[A-Z][\w\$]*/, "type.identifier"],
      // [/[A-Z][\w\$]*/, 'identifier'],
      // whitespace
      { include: "@whitespace" },
      // regular expression: ensure it is terminated before beginning (otherwise it is an opeator)
      [
        /\/(?=([^\\\/]|\\.)+\/([gimsuy]*)(\s*)(\.|;|,|\)|\]|\}|$))/,
        { token: "regexp", bracket: "@open", next: "@regexp" }
      ],
      // delimiters and operators
      [/[()\[\]]/, "@brackets"],
      [/[<>](?!@symbols)/, "@brackets"],
      [/!(?=([^=]|$))/, "delimiter"],
      [
        /@symbols/,
        {
          cases: {
            "@operators": "operator",
            "@default": ""
          }
        }
      ],
      // numbers
      [/(@digits)[eE]([\-+]?(@digits))?/, "number.float"],
      [/(@digits)\.(@digits)([eE][\-+]?(@digits))?/, "number.float"],
      [/0[xX](@hexdigits)n?/, "number.hex"],
      [/0[oO]?(@octaldigits)n?/, "number.octal"],
      [/0[bB](@binarydigits)n?/, "number.binary"],
      [/(@digits)n?/, "number"],
      // delimiter: after number because of .\d floats
      [/[;,.]/, "delimiter"],
      // strings
      [/"([^"\\]|\\.)*$/, "string.invalid"],
      [/'([^'\\]|\\.)*$/, "string.invalid"],
      [/"/, "string", "@string_double"],
      [/'/, "string", "@string_single"],
      [/`/, "string", "@string_backtick"]
    ],
    whitespace: [
      [/[ \t\r\n]+/, ""],
      [/\/\*\*(?!\/)/, "comment.doc", "@jsdoc"],
      [/\/\*/, "comment", "@comment"],
      [/\/\/.*$/, "comment"]
    ],
    comment: [
      [/[^\/*]+/, "comment"],
      [/\*\//, "comment", "@pop"],
      [/[\/*]/, "comment"]
    ],
    jsdoc: [
      [/[^\/*]+/, "comment.doc"],
      [/\*\//, "comment.doc", "@pop"],
      [/[\/*]/, "comment.doc"]
    ],
    // We match regular expression quite precisely
    regexp: [
      [
        /(\{)(\d+(?:,\d*)?)(\})/,
        [
          "regexp.escape.control",
          "regexp.escape.control",
          "regexp.escape.control"
        ]
      ],
      [
        /(\[)(\^?)(?=(?:[^\]\\\/]|\\.)+)/,
        [
          "regexp.escape.control",
          { token: "regexp.escape.control", next: "@regexrange" }
        ]
      ],
      [/(\()(\?:|\?=|\?!)/, ["regexp.escape.control", "regexp.escape.control"]],
      [/[()]/, "regexp.escape.control"],
      [/@regexpctl/, "regexp.escape.control"],
      [/[^\\\/]/, "regexp"],
      [/@regexpesc/, "regexp.escape"],
      [/\\\./, "regexp.invalid"],
      [
        /(\/)([gimsuy]*)/,
        [{ token: "regexp", bracket: "@close", next: "@pop" }, "keyword.other"]
      ]
    ],
    regexrange: [
      [/-/, "regexp.escape.control"],
      [/\^/, "regexp.invalid"],
      [/@regexpesc/, "regexp.escape"],
      [/[^\]]/, "regexp"],
      [
        /\]/,
        { token: "regexp.escape.control", next: "@pop", bracket: "@close" }
      ]
    ],
    string_double: [
      [/[^\\"]+/, "string"],
      [/@escapes/, "string.escape"],
      [/\\./, "string.escape.invalid"],
      [/"/, "string", "@pop"]
    ],
    string_single: [
      [/[^\\']+/, "string"],
      [/@escapes/, "string.escape"],
      [/\\./, "string.escape.invalid"],
      [/'/, "string", "@pop"]
    ],
    string_backtick: [
      [/\$\{/, { token: "backtick.bracket", next: "@bracketCounting" }],
      [/[^\\`$]+/, "string"],
      [/@escapes/, "string.escape"],
      [/\\./, "string.escape.invalid"],
      [/`/, "string", "@pop"]
    ],
    bracketCounting: [
      [/\{/, "delimiter.bracket", "@bracketCounting"],
      [/\}/, "delimiter.bracket", "@pop"],
      { include: "common" }
    ]
  }
};
