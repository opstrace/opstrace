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

import React from "react";
import * as monaco from "monaco-editor";
import { withTheme } from "styled-components";
import { ITheme } from "client/themes";
import darkTheme, { globalEditorCSS as DarkGlobalEditorCss } from "./dark";
import lightTheme, { globalEditorCSS as LightGlobalEditorCss } from "./light";

export const MONACO_LIGHT_THEME = "opstrace-light";
export const MONACO_DARK_THEME = "opstrace-dark";

monaco.editor.defineTheme(MONACO_LIGHT_THEME, lightTheme);
monaco.editor.defineTheme(MONACO_DARK_THEME, darkTheme);

export const GlobalEditorCSS = withTheme((props: { theme: ITheme }) => {
  if (props.theme.palette.type === "dark") {
    return <DarkGlobalEditorCss />;
  }
  return <LightGlobalEditorCss />;
});
