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
import { create } from "@storybook/theming/create";
import TracyImg from "./tracy.png";

const blue = "#091570";
const pink = "#f54773";
const charcoal = "#18181a";

export default create({
  base: "dark",

  colorPrimary: pink,
  colorSecondary: pink,
  appBg: blue,
  appContentBg: "black",
  appBorderColor: "black",

  // Toolbar default and active colors
  barBg: "black",
  barSelectedColor: pink,

  brandTitle: "Opstrace",
  brandUrl: "https://opstrace.com",
  brandImage: TracyImg
});
