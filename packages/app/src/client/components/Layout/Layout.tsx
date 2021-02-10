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

import React, { useCallback, useEffect, useRef, useState } from "react";
import Row from "./Row";
import * as constants from "./constants";
import styled from "styled-components";

type WrapperProps = {
  visible: boolean;
};

const Wrapper = styled.div<WrapperProps>(props => ({
  display: "flex",
  flexDirection: "column",
  flexGrow: 1,
  flexWrap: "wrap",
  opacity: props.visible ? 1 : 0
}));

export type LayoutProps = {
  minHeight: number;
  width: number;
  children: React.ReactElement<any> | React.ReactElement<any>[];
};

/**
 * Layout is used internally (not exposed to modules directly).
 *
 * It's purpose is to manage the layout of Row and Container components to ensure
 * the space is divided appropriately and laid out in a sensible, consistent
 * manner for various viewports sizes.
 */
const Layout = (props: LayoutProps) => {
  const children = React.Children.map(props.children, child => {
    if (child.type === Row) {
      return child;
    }

    return <Row>{child}</Row>;
  });
  const nodeRef = useRef<null | HTMLDivElement>(null);

  const roughChildHeight = () =>
    props.minHeight / children.length < constants.MIN_ITEM_HEIGHT
      ? constants.MIN_ITEM_HEIGHT
      : props.minHeight / children.length;

  const [minChildHeight, setMinChildHeight] = useState(roughChildHeight());
  const [visible, setVisible] = useState(false);

  // Hide any initial flickering of recalculating the layout
  useEffect(() => {
    if (nodeRef.current && !visible) {
      // set visible on next RAF
      setTimeout(() => setVisible(true));
    }
  }, [minChildHeight, visible]);

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
            : newHeight
        );
      } else {
        const expansion = props.minHeight / node.clientHeight;
        // expand current minChildHeight
        const newHeight = minChildHeight * expansion;

        setMinChildHeight(
          newHeight < constants.MIN_ITEM_HEIGHT
            ? constants.MIN_ITEM_HEIGHT
            : newHeight
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

  return (
    <Wrapper ref={layoutRef} className="Layout" visible={visible}>
      {children.map(child =>
        React.cloneElement(child, { minHeight: minChildHeight })
      )}
    </Wrapper>
  );
};

export default Layout;
