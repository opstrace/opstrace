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
