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
import Box from "@material-ui/core/Box";
import styled from "styled-components";

import Row from "./Row";
import Column from "./Column";

export type PanelProps = {
  minHeight?: number;
  children: React.ReactNode;
};

const PanelWrapper = styled(Box)`
  border-radius: 2px;
  overflow: hidden;
  border: 1px solid ${props => props.theme?.palette?.divider};
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const Panel = (props: PanelProps) => {
  let children = props.children;
  let hasLayoutComponentChild = false;

  if (React.isValidElement(children)) {
    // Check if any of the children are layout components
    React.Children.forEach(children, (c, idx) => {
      if (c.type === Column || c.type === Row) {
        hasLayoutComponentChild = true;
      }
    });

    if (hasLayoutComponentChild) {
      // Don't create a panel in this case. Map all components to layout components
      children = React.Children.map(children, (c, idx) => {
        if (c.type === Row) {
          // wrap in an Column component
          return React.cloneElement(c, {
            minHeight: props.minHeight,
            key: idx
          });
        }
        return <Row minHeight={props.minHeight}>{c}</Row>;
      });
    }
  }

  if (hasLayoutComponentChild) {
    return <>{children}</>;
  }

  return (
    <Box width="100%" height="100%" p={0.25} className="LayoutPanel">
      <PanelWrapper p={1}>{children}</PanelWrapper>
    </Box>
  );
};

Panel.displayName = "LayoutPanel";

export default Panel;
