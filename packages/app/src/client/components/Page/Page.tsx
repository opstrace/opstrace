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
import MuiBox, { BoxProps as MuiBoxProps } from "@material-ui/core/Box";

export type PageProps = MuiBoxProps;

const Page = (props: PageProps) => (
  <MuiBox
    width="100vw"
    height="100vh"
    display="flex"
    justifyContent="center"
    alignItems="center"
    flexWrap="wrap"
    p={1}
    {...props}
  />
);

export default Page;
