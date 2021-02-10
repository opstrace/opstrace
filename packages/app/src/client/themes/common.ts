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

import { ThemeOptions } from "@material-ui/core/styles";
import * as colors from "@material-ui/core/colors";

const common: ThemeOptions = {
  overrides: {
    MuiTab: {
      root: {
        minWidth: "48px",
        "@media (min-width: 0px)": {
          minWidth: "48px"
        }
      }
    }
  },
  props: {
    MuiTabs: {
      indicatorColor: "primary",
      TabIndicatorProps: {
        style: {
          left: "0px",
          width: "3px",
          right: "unset"
        }
      }
    },
    MuiBackdrop: {
      transitionDuration: 0
    },
    MuiDialog: {
      transitionDuration: 0
    }
  },
  palette: {
    primary: {
      main: "#F54773",
      contrastText: colors.common.white
    },
    secondary: {
      main: colors.blue.A400,
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
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"'
    ].join(","),
    button: {
      textTransform: "none"
    },
    body2: {
      fontSize: 13,
      fontWeight: 500,
      lineHeight: 1
    }
  },
  shape: {
    borderRadius: 2
  }
};

export default common;
