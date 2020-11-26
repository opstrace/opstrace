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

import * as monaco from "monaco-editor";
import dot from "dot-object";
import * as colors from "@material-ui/core/colors";
import { createGlobalStyle, css } from "styled-components";
import { SyntaxClass } from "../workers/modulescript";

const entries = Object.entries as <T>(
  o: T
) => [Extract<keyof T, string>, T[keyof T]][];

const white = "#ffffff";
const black = "#161616";
const variableColor = "#c97c2a";

const syntaxClasses: { [key in SyntaxClass]: string } = {
  variable: variableColor,
  type: colors.teal.A700,
  scope: "#db9504",
  function: colors.lightBlue.A700,
  number: colors.orange[400],
  string: colors.lightGreen[800],
  comment: colors.blueGrey[600],
  constant: variableColor,
  directive: colors.grey[900],
  control: colors.grey[900],
  operator: colors.teal.A700,
  modifier: colors.pink[600],
  punctuation: colors.grey[900]
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
  contrastBorder: colors.grey[200],
  errorForeground: colors.red[500],
  focusBorder: colors.grey[200],
  foreground: colors.grey[800],
  activityBar: {
    background: white,
    border: colors.grey[200]
  },
  activityBarBadge: {
    background: colors.red[500]
  },
  button: {
    background: colors.blue[600],
    foreground: black,
    border: colors.blue[600],
    hoverBackground: colors.blue[600]
  },
  dropdown: {
    background: white,
    border: colors.grey[300],
    foreground: black
  },
  editor: {
    background: white,
    foreground: colors.grey[800],
    hoverHighlightBackground: colors.grey[300],
    inactiveSelectionBackground: colors.grey[300],
    lineHighlightBackground: colors.grey[200],
    lineHighlightBorder: colors.grey[200],
    rangeHighlightBackground: colors.grey[200],
    selectionBackground: colors.grey[200],
    selectionHighlightBackground: colors.grey[200],
    wordHighlightStrongBackground: colors.grey[200],
    wordHighlightBackground: colors.grey[200]
  },
  editorBracketMatch: {
    background: colors.grey[200],
    border: colors.grey[200]
  },
  editorCodeLens: {
    foreground: colors.grey[800]
  },
  editorCursor: {
    background: white,
    foreground: black
  },
  editorError: {
    border: colors.grey[200],
    foreground: colors.red[500]
  },
  editorGroup: {
    background: white,
    border: colors.grey[200],
    dropBackground: white
  },
  editorGroupHeader: {
    tabsBackground: white,
    tabsBorder: colors.grey[200]
  },
  editorGutter: {
    background: white,
    deletedBackground: colors.red[500],
    modifiedBackground: white
  },
  editorHoverWidget: {
    background: white,
    border: colors.grey[200]
  },
  editorIndentGuide: {
    background: white
  },
  editorLink: {
    activeForeground: colors.grey[300]
  },
  editorLineNumber: {
    foreground: colors.grey[600],
    activeForeground: colors.grey[900]
  },
  editorRuler: {
    foreground: black
  },
  editorMarkerNavigation: {
    background: white
  },
  editorMarkerNavigationWarning: {
    background: colors.grey[200]
  },
  editorMarkerNavigationError: {
    background: white
  },
  editorOverviewRuler: {
    border: colors.grey[200],
    commonContentForeground: colors.grey[200],
    currentContentForeground: colors.red[500],
    incomingContentForeground: colors.green[500]
  },
  editorSuggestWidget: {
    background: white,
    border: colors.grey[200],
    foreground: colors.grey[800],
    selectedBackground: colors.grey[200]
  },
  editorWarning: {
    border: colors.grey[200],
    foreground: colors.red[300]
  },
  editorWhitespace: {
    foreground: colors.grey[800]
  },
  editorWidget: {
    background: white,
    border: colors.grey[200]
  },
  extensionButton: {
    prominentBackground: colors.grey[200],
    prominentForeground: white,
    prominentHoverBackground: colors.grey[200]
  },
  input: {
    background: colors.grey[200],
    foreground: black,
    border: colors.grey[200],
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
    dropBackground: white,
    highlightForeground: colors.lightBlue[500],
    hoverBackground: colors.grey[200],
    focusBackground: colors.grey[200],
    activeSelectionBackground: colors.grey[200],
    activeSelectionForeground: black,
    inactiveSelectionBackground: colors.grey[200],
    inactiveSelectionForeground: white,
    warningForeground: colors.amber[500],
    errorForeground: colors.red[500]
  },
  menu: {
    background: white,
    selectionBackground: colors.grey[200]
  },
  peekView: {
    border: colors.grey[300]
  },
  peekViewEditor: {
    background: colors.grey[200],
    matchHighlightBackground: colors.lightBlue[500]
  },
  peekViewResult: {
    background: colors.grey[200],
    fileForeground: white,
    lineForeground: white,
    matchHighlightBackground: colors.lightBlue[500],
    selectionBackground: colors.grey[200],
    selectionForeground: white
  },
  peekViewTitle: {
    background: colors.grey[200]
  },
  peekViewTitleDescription: {
    foreground: colors.blue[700]
  },
  peekViewTitleLabel: {
    foreground: black
  },
  scrollbarSlider: {
    activeBackground: white,
    border: colors.grey[200]
  },
  selection: {
    background: colors.blue[700]
  },
  separator: {
    background: colors.grey[300],
    foreground: black
  },
  sideBar: {
    background: white,
    border: colors.grey[200],
    foreground: colors.grey[800]
  },
  sideBarSectionHeader: {
    background: white,
    foreground: black,
    border: colors.grey[200]
  },
  sideBarTitle: {
    foreground: black
  },
  statusBar: {
    background: colors.grey[200],
    foreground: black,
    debuggingBackground: colors.red[500],
    debuggingForeground: colors.grey[200],
    noFolderBackground: colors.grey[200],
    noFolderForeground: white,
    border: colors.grey[200]
  },
  statusBarItem: {
    prominentBackground: colors.red[500],
    prominentHoverBackground: colors.amber[500],
    remoteForeground: colors.grey[100],
    remoteBackground: colors.purple[500]
  },
  tab: {
    activeBackground: white,
    activeForeground: white,
    border: colors.grey[200],
    activeBorder: colors.lightBlue[500],
    inactiveBackground: white,
    inactiveForeground: colors.grey[400],
    unfocusedActiveForeground: white,
    unfocusedInactiveForeground: colors.grey[400]
  },
  titleBar: {
    background: white,
    activeBackground: white,
    activeForeground: white,
    border: colors.grey[200],
    inactiveBackground: white,
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
      foreground: colors.purple.A700
    }
  },
  {
    name: "Storage",
    scope: ["storage"],
    settings: {
      foreground: colors.purple.A700
    }
  },
  {
    name: "Constant",
    scope: ["constant"],
    settings: {
      foreground: syntaxClasses.constant
    }
  },
  {
    name: "Variable",
    scope: ["variable"],
    settings: {
      foreground: syntaxClasses.variable
    }
  },
  {
    name: "String",
    scope: ["string"],
    settings: {
      foreground: syntaxClasses.string
    }
  },
  {
    name: "String",
    scope: ["number"],
    settings: {
      foreground: colors.deepOrange.A200
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
      foreground: black,
      background: colors.red[400]
    }
  },
  {
    name: "Markup Bold",
    scope: ["markup.bold"],
    settings: {
      foreground: colors.deepOrange.A200,
      fontStyle: "bold"
    }
  },
  {
    name: "Markup Changed",
    scope: ["markup.changed"],
    settings: {
      foreground: colors.purple.A700
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
      foreground: colors.purple.A700,
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
      foreground: colors.purple.A700
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
      foreground: colors.deepOrange.A200
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
  base: "vs",
  colors: dot.dot(editorColors),
  rules: transformVscodeTokens()
};
export default theme;
