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

import deepmerge from "deepmerge";
import { createMuiTheme } from "@material-ui/core/styles";
import * as colors from "@material-ui/core/colors";

import { PaletteType } from "./types";
import common from "./common";

export const theme = {
  name: "light",
  palette: {
    type: "light" as PaletteType,
    background: {
      default: "white",
      paper: "white"
    },
    divider: colors.grey[400],
    primary: {
      main: "#5664D2",
      contrastText: colors.common.white
    }
  }
};

export default createMuiTheme(deepmerge(common, theme));
