import React from "react";
import Column from "./Column";
import * as constants from "./constants";
import styled from "styled-components";

const Wrapper = styled.div`
  display: flex;
  flex-direction: row;
  flex-grow: 1;
  flex-wrap: wrap;
`;

export type RowProps = {
  minHeight?: number;
  children: React.ReactElement<any> | React.ReactElement<any>[];
};

const Row = (props: RowProps) => {
  const children = React.Children.map(props.children, (child, idx) => {
    if (child.type !== Column) {
      // wrap in an Column component
      return (
        <Column key={idx} minHeight={props.minHeight}>
          {child}
        </Column>
      );
    }
    return React.cloneElement(child, { minHeight: props.minHeight, key: idx });
  });

  return (
    <Wrapper
      style={{
        minHeight: props.minHeight || constants.MIN_ITEM_HEIGHT,
        width: "100%"
      }}
      className="LayoutRow"
    >
      {children}
    </Wrapper>
  );
};

Row.displayName = "LayoutRow";

export default Row;
