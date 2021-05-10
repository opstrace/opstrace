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

import { ThemeOptions } from "@material-ui/core/styles";
import * as colors from "@material-ui/core/colors";

const common: ThemeOptions = {
  props: {
    MuiBackdrop: {
      transitionDuration: 0
    },
    MuiDialog: {
      transitionDuration: 0
    },
    MuiListItemText: {
      primaryTypographyProps: {
        style: {
          fontWeight: 700
        }
      },
      secondaryTypographyProps: {
        style: {
          fontWeight: 700
        }
      }
    }
  },
  palette: {
    primary: {
      main: "#688EFF",
      contrastText: colors.common.white
    },
    secondary: {
      main: "#F54773",
      contrastText: colors.common.white
    },
    success: {
      main: colors.green.A400,
      contrastText: colors.common.black
    },
    warning: {
      main: colors.amber.A400,
      contrastText: colors.common.black
    },
    error: {
      main: colors.deepOrange.A400,
      contrastText: colors.common.white
    },
    info: {
      main: colors.blueGrey[200],
      contrastText: colors.common.black
    },
    contrastThreshold: 3
  },
  typography: {
    fontFamily: [
      "fakt-web",
      "-apple-system",
      "BlinkMacSystemFont",
      "Segoe UI",
      "Roboto",
      "Helvetica",
      "Arial",
      "sans-serif",
      "Apple Color Emoji",
      "Segoe UI Emoji",
      "Segoe UI Symbol"
    ].join(","),
    button: {
      textTransform: "none"
    },
    body2: {
      fontSize: "0.875rem",
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: "0.00938em"
    },
    body1: {
      fontSize: "1rem",
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: "0.00938em"
    },
    subtitle2: {
      fontWeight: 600,
      fontSize: "0.875rem"
    },
    h1: {
      fontWeight: 400,
      lineHeight: 1.26667,
      letterSpacing: "-0.00833em",
      fontSize: "1.875rem"
    },
    h6: {
      fontWeight: 800,
      fontSize: "0.8rem"
    }
  },
  shape: {
    borderRadius: 6
  }
};

export default common;
