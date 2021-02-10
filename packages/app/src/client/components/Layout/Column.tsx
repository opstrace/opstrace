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
import * as constants from "./constants";
import Row from "./Row";
import Panel from "./Panel";

export type ColumnProps = {
  minHeight?: number;
  children: React.ReactElement<any> | React.ReactElement<any>[];
};

const Column = (props: ColumnProps) => {
  let children = React.Children.map(props.children, (child, idx) => {
    if (child.type === Row) {
      return React.cloneElement(child, {
        minHeight: props.minHeight,
        key: idx
      });
    }
    if (child.type === Column) {
      // wrap in a Row component
      return (
        <Row key={idx} minHeight={props.minHeight}>
          {child}
        </Row>
      );
    }
    if (child.type !== Panel) {
      // wrap in a Panel component
      return <Panel key={idx}>{child}</Panel>;
    }
    // child is already a Panel
    return React.cloneElement(child, { key: idx });
  });

  const hasMultipleChildren = children.length > 1;

  if (hasMultipleChildren) {
    // ensure all children are Rows
    children = children.map((child, idx) => {
      if (child.type === Row) {
        return child;
      }
      // wrap in a Row if not already a Row
      return (
        <Row key={`second-${idx}`} minHeight={props.minHeight}>
          {child}
        </Row>
      );
    });
  }

  return (
    <Box
      flexGrow={1}
      display="flex"
      flexDirection="column"
      minHeight={props.minHeight || constants.MIN_ITEM_HEIGHT}
      minWidth={constants.MIN_ITEM_WIDTH}
      className="LayoutColumn"
    >
      {children}
    </Box>
  );
};

Column.displayName = "LayoutColumn";

export default Column;
