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

import * as monaco from "monaco-editor";
import dot from "dot-object";
import * as colors from "@material-ui/core/colors";
import { createGlobalStyle, css } from "styled-components";
import { SyntaxClass } from "../workers/modulescript";

const entries = Object.entries as <T>(
  o: T
) => [Extract<keyof T, string>, T[keyof T]][];

const white = "#ffffff";
const black = "#18181a";
const variableColor = "#f2b472";

const syntaxClasses: { [key in SyntaxClass]: string } = {
  variable: variableColor,
  type: colors.teal.A400,
  scope: colors.amber.A100,
  function: colors.lightBlue.A200,
  number: colors.orange[200],
  string: colors.lightGreen[300],
  comment: colors.blueGrey[600],
  constant: variableColor,
  directive: colors.grey[200],
  control: colors.grey[200],
  operator: colors.teal.A400,
  modifier: colors.red[300],
  punctuation: colors.grey[200]
};

export const globalEditorCSS = createGlobalStyle`
  ${entries(syntaxClasses).map(
    ([name, color]) =>
      css`
        span.${name} {
          color: ${color} !important;
        }
      `
  )}
`;

const editorColors = {
  contrastBorder: colors.grey[800],
  errorForeground: colors.red[500],
  focusBorder: colors.grey[800],
  foreground: colors.grey[300],
  activityBar: {
    background: black,
    border: colors.grey[800]
  },
  activityBarBadge: {
    background: colors.red[500]
  },
  button: {
    background: colors.blue[600],
    foreground: white,
    border: colors.blue[600],
    hoverBackground: colors.blue[600]
  },
  dropdown: {
    background: black,
    border: colors.grey[800],
    foreground: white
  },
  editor: {
    background: black,
    foreground: colors.grey[300],
    hoverHighlightBackground: colors.grey[800],
    inactiveSelectionBackground: colors.grey[800],
    lineHighlightBackground: colors.grey[900],
    lineHighlightBorder: colors.grey[800],
    rangeHighlightBackground: colors.grey[900],
    selectionBackground: colors.grey[900],
    selectionHighlightBackground: colors.grey[900],
    wordHighlightStrongBackground: colors.grey[900],
    wordHighlightBackground: colors.grey[900]
  },
  editorBracketMatch: {
    background: colors.grey[900],
    border: colors.grey[800]
  },
  editorCodeLens: {
    foreground: colors.grey[900]
  },
  editorCursor: {
    background: black,
    foreground: white
  },
  editorError: {
    border: colors.grey[800],
    foreground: colors.red[500]
  },
  editorGroup: {
    background: black,
    border: colors.grey[800],
    dropBackground: black
  },
  editorGroupHeader: {
    tabsBackground: black,
    tabsBorder: colors.grey[900]
  },
  editorGutter: {
    background: black,
    deletedBackground: colors.red[500],
    modifiedBackground: black
  },
  editorHoverWidget: {
    background: black,
    border: colors.grey[800]
  },
  editorIndentGuide: {
    background: black
  },
  editorLink: {
    activeForeground: colors.grey[300]
  },
  editorLineNumber: {
    foreground: colors.grey[600],
    activeForeground: colors.grey[200]
  },
  editorRuler: {
    foreground: white
  },
  editorMarkerNavigation: {
    background: black
  },
  editorMarkerNavigationWarning: {
    background: colors.grey[900]
  },
  editorMarkerNavigationError: {
    background: black
  },
  editorOverviewRuler: {
    border: colors.grey[800],
    commonContentForeground: colors.grey[900],
    currentContentForeground: colors.red[500],
    incomingContentForeground: colors.green[500]
  },
  editorSuggestWidget: {
    background: black,
    border: colors.grey[800],
    foreground: colors.grey[300],
    selectedBackground: colors.grey[900]
  },
  editorWarning: {
    border: colors.grey[800],
    foreground: colors.red[300]
  },
  editorWhitespace: {
    foreground: colors.grey[800]
  },
  editorWidget: {
    background: black,
    border: colors.grey[800]
  },
  extensionButton: {
    prominentBackground: colors.grey[900],
    prominentForeground: white,
    prominentHoverBackground: colors.grey[900]
  },
  input: {
    background: colors.grey[900],
    foreground: white,
    border: colors.grey[800],
    placeholderForeground: colors.grey[400]
  },
  inputOption: {
    activeBorder: colors.lightBlue[500]
  },
  inputValidation: {
    infoBorder: colors.purple[500],
    warningBorder: colors.amber[500],
    errorBorder: colors.red[500]
  },
  list: {
    dropBackground: black,
    highlightForeground: colors.lightBlue[500],
    hoverBackground: colors.grey[900],
    focusBackground: colors.grey[900],
    activeSelectionBackground: colors.grey[900],
    activeSelectionForeground: white,
    inactiveSelectionBackground: colors.grey[900],
    inactiveSelectionForeground: white,
    warningForeground: colors.amber[500],
    errorForeground: colors.red[500]
  },
  menu: {
    background: black,
    selectionBackground: colors.grey[900]
  },
  peekView: {
    border: colors.grey[800]
  },
  peekViewEditor: {
    background: colors.grey[900],
    matchHighlightBackground: colors.lightBlue[500]
  },
  peekViewResult: {
    background: colors.grey[900],
    fileForeground: white,
    lineForeground: white,
    matchHighlightBackground: colors.lightBlue[500],
    selectionBackground: colors.grey[900],
    selectionForeground: white
  },
  peekViewTitle: {
    background: colors.grey[900]
  },
  peekViewTitleDescription: {
    foreground: colors.blue[700]
  },
  peekViewTitleLabel: {
    foreground: white
  },
  scrollbarSlider: {
    activeBackground: white,
    border: colors.grey[800]
  },
  selection: {
    background: colors.blue[700]
  },
  separator: {
    background: colors.grey[800],
    foreground: white
  },
  sideBar: {
    background: black,
    border: colors.grey[800],
    foreground: colors.grey[200]
  },
  sideBarSectionHeader: {
    background: black,
    foreground: white,
    border: colors.grey[800]
  },
  sideBarTitle: {
    foreground: white
  },
  statusBar: {
    background: colors.grey[900],
    foreground: white,
    debuggingBackground: colors.red[500],
    debuggingForeground: colors.grey[900],
    noFolderBackground: colors.grey[900],
    noFolderForeground: white,
    border: colors.grey[800]
  },
  statusBarItem: {
    prominentBackground: colors.red[500],
    prominentHoverBackground: colors.amber[500],
    remoteForeground: colors.grey[100],
    remoteBackground: colors.purple[500]
  },
  tab: {
    activeBackground: black,
    activeForeground: white,
    border: colors.grey[800],
    activeBorder: colors.lightBlue[500],
    inactiveBackground: black,
    inactiveForeground: colors.grey[400],
    unfocusedActiveForeground: white,
    unfocusedInactiveForeground: colors.grey[400]
  },
  titleBar: {
    background: black,
    activeBackground: black,
    activeForeground: white,
    border: colors.grey[800],
    inactiveBackground: black,
    inactiveForeground: colors.grey[300]
  }
};

const vscodeTokens = [
  {
    name: "Delimeter Bracket",
    scope: ["backtick.bracket"],
    settings: {
      foreground: syntaxClasses.modifier
    }
  },
  {
    name: "Operator",
    scope: ["operator"],
    settings: {
      foreground: syntaxClasses.operator
    }
  },
  {
    name: "Comment",
    scope: ["comment"],
    settings: {
      foreground: colors.blueGrey[600],
      fontStyle: "italic"
    }
  },
  {
    name: "Keyword",
    scope: ["keyword"],
    settings: {
      foreground: colors.purple.A100
    }
  },
  {
    name: "Storage",
    scope: ["storage"],
    settings: {
      foreground: colors.purple.A100
    }
  },
  {
    name: "Constant",
    scope: ["constant"],
    settings: {
      foreground: colors.deepOrange.A100
    }
  },
  {
    name: "Variable",
    scope: ["variable"],
    settings: {
      foreground: colors.pink.A200
    }
  },
  {
    name: "String",
    scope: ["string"],
    settings: {
      foreground: colors.lightGreen[300]
    }
  },
  {
    name: "String",
    scope: ["number"],
    settings: {
      foreground: colors.deepOrange.A100
    }
  },
  {
    name: "None",
    scope: ["none"],
    settings: {
      foreground: colors.blueGrey[300]
    }
  },
  {
    name: "Invalid Deprecated",
    scope: ["invalid.deprecated"],
    settings: {
      foreground: colors.brown[800],
      background: colors.amber[300]
    }
  },
  {
    name: "Invalid Illegal",
    scope: ["invalid.illegal"],
    settings: {
      foreground: white,
      background: colors.red[400]
    }
  },
  {
    name: "Markup Bold",
    scope: ["markup.bold"],
    settings: {
      foreground: colors.deepOrange.A100,
      fontStyle: "bold"
    }
  },
  {
    name: "Markup Changed",
    scope: ["markup.changed"],
    settings: {
      foreground: colors.purple.A100
    }
  },
  {
    name: "Markup Deleted",
    scope: ["markup.deleted"],
    settings: {
      foreground: colors.pink.A200
    }
  },
  {
    name: "Markup Italic",
    scope: ["markup.italic"],
    settings: {
      foreground: colors.purple.A100,
      fontStyle: "italic"
    }
  },
  {
    name: "Markup Heading",
    scope: ["markup.heading"],
    settings: {
      foreground: colors.pink.A200
    }
  },
  {
    name: "Markup Heading Punctuation Definition Heading",
    scope: ["markup.heading punctuation.definition.heading"],
    settings: {
      foreground: colors.lightBlue.A400
    }
  },
  {
    name: "Markup Link",
    scope: ["markup.link"],
    settings: {
      foreground: colors.purple.A100
    }
  },
  {
    name: "Markup Inserted",
    scope: ["markup.inserted"],
    settings: {
      foreground: colors.green.A200
    }
  },
  {
    name: "Markup Quote",
    scope: ["markup.quote"],
    settings: {
      foreground: colors.deepOrange.A100
    }
  },
  {
    name: "Markup Raw",
    scope: ["markup.raw"],
    settings: {
      foreground: colors.green.A200
    }
  },
  {
    scope: "token.info-token",
    settings: {
      foreground: colors.lightBlue[600]
    }
  },
  {
    scope: "token.warn-token",
    settings: {
      foreground: colors.lightBlue[700]
    }
  },
  {
    scope: "token.error-token",
    settings: {
      foreground: colors.red[700]
    }
  },
  {
    scope: "token.debug-token",
    settings: {
      foreground: colors.purple[400]
    }
  }
];

function removeUndefined(
  rule: monaco.editor.ITokenThemeRule
): monaco.editor.ITokenThemeRule {
  return entries(rule).reduce<monaco.editor.ITokenThemeRule>(
    (acc, [key, value]) => {
      if (value) {
        acc[key] = value;
      }
      return acc;
    },
    { token: rule.token }
  );
}

function transformVscodeTokens(): monaco.editor.ITokenThemeRule[] {
  const rules: monaco.editor.ITokenThemeRule[] = [];
  vscodeTokens.forEach(token => {
    if (Array.isArray(token.scope)) {
      token.scope.forEach(scope => {
        rules.push(
          removeUndefined({
            token: scope,
            foreground: token.settings.foreground,
            background: token.settings.background,
            fontStyle: token.settings.fontStyle
          })
        );
      });
    } else {
      rules.push(
        removeUndefined({
          token: token.scope,
          foreground: token.settings.foreground,
          background: token.settings.background,
          fontStyle: token.settings.fontStyle
        })
      );
    }
  });

  return rules;
}

const theme: monaco.editor.IStandaloneThemeData = {
  inherit: true,
  base: "vs-dark",
  colors: dot.dot(editorColors),
  rules: transformVscodeTokens()
};
export default theme;
