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

import React from "react";
import Box from "@material-ui/core/Box";
import styled from "styled-components";

export type PanelProps = {
  children: React.ReactNode;
};

const PanelWrapper = styled(Box)`
  border-radius: 2px;
  overflow: hidden;
  border: 1px solid ${props => props.theme.palette.divider};
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const Panel = (props: PanelProps) => {
  return (
    <Box width="100%" height="100%" p={0.25} className="LayoutPanel">
      <PanelWrapper p={1}>{props.children}</PanelWrapper>
    </Box>
  );
};

Panel.displayName = "LayoutPanel";

export default Panel;
