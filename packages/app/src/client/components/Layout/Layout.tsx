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

import React, { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import AutoSizer from "react-virtualized-auto-sizer";

import { Scrollable } from "client/components/Scrollable";
import { Box } from "client/components/Box";
import * as constants from "./constants";
import Row from "./Row";

const Wrapper = styled.div<{}>(props => ({
  display: "flex",
  flexDirection: "column",
  flexGrow: 1,
  flexWrap: "wrap"
}));

export type LayoutProps = {
  children: React.ReactElement<any> | React.ReactElement<any>[];
};

/**
 * Layout is used to manage the layout of Row and Columns to ensure
 * the space is divided appropriately and laid out in a sensible, consistent
 * manner for various viewports sizes.
 */
const AutoSizedLayout = (props: LayoutProps) => (
  <Box width="100%" height="100%" className="Layout">
    <AutoSizer style={{ width: "100%", height: "100%" }}>
      {({ width, height }) => (
        <Box width="100%" height="100%">
          <Scrollable>
            <Box p={0} justifyContent="left" alignItems="normal">
              <Layout minHeight={height} width={width}>
                {props.children}
              </Layout>
            </Box>
          </Scrollable>
        </Box>
      )}
    </AutoSizer>
  </Box>
);

const Layout = (props: LayoutProps & { minHeight: number; width: number }) => {
  const childrenCount = React.Children.count(props.children);

  const nodeRef = useRef<null | HTMLDivElement>(null);
  const roughChildHeight = () =>
    props.minHeight / childrenCount < constants.MIN_ITEM_HEIGHT
      ? constants.MIN_ITEM_HEIGHT
      : props.minHeight / childrenCount;

  const [minChildHeight, setMinChildHeight] = useState(roughChildHeight());

  useEffect(() => {
    /**
     * for every new layout dimension, we should at most have two renders.
     * 1. the initial render where we take a course grained guess at minHeight with roughMinHeight()
     * 2. we calculate how much we need to shrink or expand the rough minHeight from (1) once we
     *    can measure the dom node.
     */
    const calculateHeight = () => {
      const node = nodeRef.current;
      if (!node) {
        return;
      }

      if (node.clientHeight > props.minHeight) {
        const shrinkage = node.clientHeight / props.minHeight;
        // shrink current minChildHeight
        const newHeight = minChildHeight / shrinkage;

        setMinChildHeight(
          newHeight < constants.MIN_ITEM_HEIGHT
            ? constants.MIN_ITEM_HEIGHT
            : Math.round(newHeight)
        );
      } else {
        const expansion = props.minHeight / node.clientHeight;
        // expand current minChildHeight
        const newHeight = minChildHeight * expansion;

        setMinChildHeight(
          newHeight < constants.MIN_ITEM_HEIGHT
            ? constants.MIN_ITEM_HEIGHT
            : Math.round(newHeight)
        );
      }
    };
    calculateHeight();
  }, [props.width, props.minHeight, minChildHeight]);

  const layoutRef = useCallback(async node => {
    if (node) {
      nodeRef.current = node;
    } else {
      nodeRef.current = null;
    }
  }, []);

  let shouldWrapInRow = false;

  const children = React.Children.map(props.children, (child, idx) => {
    if (child.type !== Row) {
      shouldWrapInRow = true;
    }
    return React.cloneElement(child, {
      minHeight: minChildHeight,
      key: idx
    });
  });

  return (
    <Wrapper ref={layoutRef} className="RowWrapper">
      {shouldWrapInRow ? (
        <Row minHeight={minChildHeight}>{children}</Row>
      ) : (
        children
      )}
    </Wrapper>
  );
};

export default AutoSizedLayout;
