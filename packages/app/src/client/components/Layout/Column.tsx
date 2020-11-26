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
