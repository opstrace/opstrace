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

import * as ts from "../lib/typescriptServices";
import { SyntaxClass } from "../index";

let syntaxKindNameCache: { [kind: number]: string } = {};

export function getSyntaxKindName(kind: ts.SyntaxKind) {
  return syntaxKindNameCache[kind];
}

(function setupSyntaxKindNameCache() {
  // some SyntaxKinds are repeated, so only use the first one
  const kindNames: { [kind: number]: string } = {};
  for (const name of Object.keys(ts.SyntaxKind).filter(k =>
    isNaN(parseInt(k, 10))
  )) {
    const value = (ts.SyntaxKind as any)[name] as number;
    if (kindNames[value] == null) kindNames[value] = name;
  }
  syntaxKindNameCache = kindNames;
})();

const syntaxClasses: { [key: string]: SyntaxClass } = {
  "Identifier.VariableDeclaration": "variable",
  "Identifier.ElementAccessExpression": "variable",
  "Identifier[0].PropertyAccessExpression.BinaryExpression": "variable",
  "Identifier.JsxAttribute": "variable",
  NullKeyword: "variable",

  "Identifier.PropertyAccessExpression.CallExpression": "scope",
  "Identifier.JsxClosingElement.JsxElement": "scope",
  "Identifier.JsxOpeningElement.JsxElement": "scope",
  "Identifier.ClassDeclaration": "scope",

  "Identifier[2].PropertyAccessExpression.BinaryExpression": "modifier",
  "Identifier[0].PropertyAccessExpression": "modifier",
  "Identifier[0].PropertyAccessExpression.CallExpression": "modifier",
  "Identifier.NamespaceImport.ImportClause": "modifier",
  "AsteriskToken.NamespaceImport.ImportClause": "modifier",
  "Identifier.ImportClause.ImportDeclaration": "modifier",
  DefaultKeyword: "modifier",
  TemplateTail: "modifier",
  "Identifier.PropertyAssignment": "modifier",

  "Identifier.FunctionDeclaration": "function",
  "Identifier.FunctionExpression": "function",
  "Identifier[2].PropertyAccessExpression": "function",
  "Identifier[2].PropertyAccessExpression.CallExpression": "function",
  "Identifier.CallExpression": "function",
  "Identifier.MethodDeclaration": "function",

  "AsKeyword.NamespaceImport.ImportClause": "control",
  "GreaterThanToken.JsxClosingElement.JsxElement": "control",
  "GreaterThanToken.JsxOpeningElement.JsxElement": "control",
  "LessThanToken.JsxClosingElement.JsxElement": "control",
  "LessThanToken.JsxOpeningElement.JsxElement": "control",
  "SlashToken.JsxClosingElement.JsxElement": "control",
  "SlashToken.JsxOpeningElement.JsxElement": "control",
  AsKeyword: "control",
  DotDotDotToken: "control",

  "LessThanToken.BinaryExpression": "operator",
  "GreaterThanToken.BinaryExpression": "operator",
  "NullKeyword.SyntaxList.UnionType": "operator"
};

export default function getSyntaxClassname(types: string[]): string | null {
  let sClass = null;
  let idx = 0;

  while (idx++ < types.length) {
    const key = types.slice(0, idx).join(".");

    const klass = syntaxClasses[key];
    if (klass) {
      sClass = klass;
    }
  }

  return sClass;
}
