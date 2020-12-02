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
import { withKnobs } from "@storybook/addon-knobs";
import { addDecorator, addParameters, configure } from "@storybook/react";
import { withThemesProvider } from "storybook-addon-styled-component-theme";

import WithProviders from "./withProviders";
import LightTheme from "../src/client/themes/light";
import DarkTheme from "../src/client/themes/dark";

addDecorator(withThemesProvider([DarkTheme, LightTheme], WithProviders));

/*
TODO: revisit these viewports so we can test all the breakpoints we use in our theme.
*/
const viewports = {
  mobile: {
    name: "Mobile",
    styles: { width: "375px", height: "667px" }
  },
  tablet: {
    name: "Tablet",
    styles: { width: "768px", height: "1024px" }
  },
  laptop: {
    name: "Laptop",
    styles: { width: "1366px", height: "768px" }
  },
  desktop: {
    name: "Desktop",
    styles: { width: "1920px", height: "1080px" }
  }
};
addParameters({ viewport: { viewports } });
addDecorator(withKnobs);
