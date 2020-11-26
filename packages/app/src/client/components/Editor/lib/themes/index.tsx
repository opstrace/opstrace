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
