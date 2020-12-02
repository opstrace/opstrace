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
