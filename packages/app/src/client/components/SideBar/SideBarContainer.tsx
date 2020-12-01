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
import Divider from "@material-ui/core/Divider";
import Box from "../Box/Box";
import Typography from "../Typography/Typography";

export type SideBarContainerProps = {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

const SideBarContainer = (props: SideBarContainerProps) => {
  return (
    <>
      <Box p={2} display="flex" position="relative">
        <Box flexGrow={1}>
          <Typography variant="caption" style={{ fontWeight: 700 }}>
            {props.title.toUpperCase()}
          </Typography>
        </Box>
        <Box position="absolute" right={8} top={10}>
          {props.actions}
        </Box>
      </Box>
      <Divider />
      <Box p={1}>{props.children}</Box>
    </>
  );
};

export default SideBarContainer;
