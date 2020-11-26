import React, { useCallback } from "react";
import * as monaco from "monaco-editor";

import CssBaseline from "@material-ui/core/CssBaseline";
import { MuiThemeProvider, StylesProvider } from "@material-ui/core/styles";
import {
  ThemeProvider as StyledThemeProvider,
  createGlobalStyle
} from "styled-components";

import {
  MONACO_DARK_THEME,
  MONACO_LIGHT_THEME
} from "client/components/Editor/lib/themes";
import darkTheme from "./dark";
import lightTheme from "./light";
import { ITheme } from "./types";
import { useCommandService } from "../services/Command";
import { useDispatch } from "state/provider";
import { setDarkMode } from "state/user/actions";
import useCurrentUser from "state/user/hooks/useCurrentUser";

interface Props {
  children?: React.ReactNode;
  theme: ITheme;
}

const GlobalStyle = createGlobalStyle`
  body {
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    padding: 0px !important;
    background-color: ${props => props.theme.palette.background.default};
    
    &::backdrop {
      background-color: ${props => props.theme.palette.background.default};
    }
  }
`;

class ThemeProvider extends React.Component<Props> {
  render() {
    const { children, theme } = this.props;

    if (theme.palette.type === "dark") {
      monaco.editor.setTheme(MONACO_DARK_THEME);
    } else {
      monaco.editor.setTheme(MONACO_LIGHT_THEME);
    }

    return (
      <StylesProvider injectFirst>
        <MuiThemeProvider theme={theme}>
          <StyledThemeProvider theme={theme}>
            <CssBaseline />
            <GlobalStyle />
            {children}
          </StyledThemeProvider>
        </MuiThemeProvider>
      </StylesProvider>
    );
  }
}

/**
 * Wrapper around ThemeProvider that binds to darkMode updates in the store
 * and switches the theme on changes.
 */
export function ThemeSwitcher({ children }: { children: React.ReactNode }) {
  const currentUser = useCurrentUser();
  // Set darkMode by default unless explicitly false
  const darkMode = currentUser?.preference?.dark_mode === false ? false : true;
  return (
    <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
      {children}
    </ThemeProvider>
  );
}

export function ThemeCommands({ children }: { children: React.ReactNode }) {
  const currentUser = useCurrentUser();
  const darkMode = currentUser?.preference?.dark_mode === false ? false : true;
  const dispatch = useDispatch();

  const setDarkModePreference = useCallback(
    (darkMode: boolean) => {
      dispatch(setDarkMode(darkMode));
    },
    [dispatch]
  );

  useCommandService(
    {
      id: "toggle-dark-mode",
      description: darkMode ? "Turn dark mode off" : "Turn dark mode on",
      handler: () => {
        setDarkModePreference(!darkMode);
      }
    },
    [darkMode]
  );

  return <>{children}</>;
}

export default ThemeProvider;
